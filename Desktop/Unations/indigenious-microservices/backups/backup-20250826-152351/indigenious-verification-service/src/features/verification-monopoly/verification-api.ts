/**
 * Verification API Service
 * Public and partner APIs for verification checks
 * This is how third parties integrate with our monopoly
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import VerificationMonopolyEngine from './verification-engine';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

// API Schemas
const PublicVerifySchema = z.object({
  businessName: z.string().optional(),
  verificationId: z.string().optional(),
  bandNumber: z.string().optional(),
  taxId: z.string().optional(),
}).refine(data => {
  return data.businessName || data.verificationId || data.bandNumber || data.taxId;
}, {
  message: 'At least one search parameter is required',
});

const PartnerVerifySchema = z.object({
  apiKey: z.string(),
  query: PublicVerifySchema,
  includeDetails: z.boolean().default(false),
});

const BulkVerifySchema = z.object({
  apiKey: z.string(),
  queries: z.array(PublicVerifySchema).max(100),
});

const WebhookSubscribeSchema = z.object({
  apiKey: z.string(),
  webhookUrl: z.string().url(),
  events: z.array(z.enum(['verification.created', 'verification.updated', 'verification.expired'])),
  secret: z.string().min(32),
});

export class VerificationAPI {
  /**
   * Public verification endpoint - anyone can check if a business is verified
   * GET /api/verify?businessName=...
   */
  static async publicVerify(req: NextRequest): Promise<NextResponse> {
    try {
      // Rate limiting for public endpoint
      const rateLimitResult = await rateLimit(req, {
        uniqueTokenPerInterval: 500,
        interval: 60 * 1000, // 1 minute
      });
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        );
      }
      
      // Parse query parameters
      const searchParams = Object.fromEntries(req.nextUrl.searchParams);
      const query = PublicVerifySchema.parse(searchParams);
      
      // Perform verification check
      const result = await VerificationMonopolyEngine.verifyBusiness(query);
      
      if (!result.verified) {
        return NextResponse.json({
          verified: false,
          reason: result.reason,
          message: 'This business is not verified in the Indigenious network',
        }, { status: 404 });
      }
      
      // Return limited public information
      return NextResponse.json({
        verified: true,
        business: {
          name: result.verification.details.nation,
          verificationLevel: result.verification.level,
          verifiedSince: result.verification.issuedAt,
          validUntil: result.verification.expiresAt,
          indigenousOwnership: result.verification.details.indigenousOwnership,
          publicUrl: result.verification.publicUrl,
        },
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: error.errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  
  /**
   * Partner verification endpoint - for integrated partners
   * POST /api/partner/verify
   */
  static async partnerVerify(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json();
      const { apiKey, query, includeDetails } = PartnerVerifySchema.parse(body);
      
      // Validate API key
      const partner = await this.validatePartnerApiKey(apiKey);
      if (!partner) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      // Track API usage
      await this.trackApiUsage(partner.id, 'verify');
      
      // Perform verification
      const result = await VerificationMonopolyEngine.verifyBusiness({
        ...query,
        ip: req.ip,
        userAgent: req.headers.get('user-agent'),
      });
      
      if (!result.verified) {
        return NextResponse.json({
          verified: false,
          reason: result.reason,
        });
      }
      
      // Return detailed information for partners
      const response = {
        verified: true,
        verificationId: result.verification.verificationId,
        business: {
          id: result.verification.businessId,
          verificationLevel: result.verification.level,
          trustScore: result.verification.trustScore,
          verifiedSince: result.verification.issuedAt,
          validUntil: result.verification.expiresAt,
          publicUrl: result.verification.publicUrl,
        },
      };
      
      if (includeDetails) {
        response.business.details = result.verification.details;
        response.business.certifications = result.verification.details.certifications;
        response.business.networkEndorsements = result.verification.networkEndorsements;
      }
      
      return NextResponse.json(response);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request', details: error.errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  
  /**
   * Bulk verification endpoint - for high-volume partners
   * POST /api/partner/verify/bulk
   */
  static async bulkVerify(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json();
      const { apiKey, queries } = BulkVerifySchema.parse(body);
      
      // Validate API key with bulk permissions
      const partner = await this.validatePartnerApiKey(apiKey, ['bulk_verify']);
      if (!partner) {
        return NextResponse.json(
          { error: 'Invalid API key or insufficient permissions' },
          { status: 401 }
        );
      }
      
      // Track bulk API usage
      await this.trackApiUsage(partner.id, 'bulk_verify', queries.length);
      
      // Process queries in parallel
      const results = await Promise.all(
        queries.map(async (query) => {
          try {
            const result = await VerificationMonopolyEngine.verifyBusiness(query);
            return {
              query,
              verified: result.verified,
              reason: result.reason,
              verificationId: result.verification?.verificationId,
            };
          } catch (error) {
            return {
              query,
              verified: false,
              error: 'Processing error',
            };
          }
        })
      );
      
      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          verified: results.filter(r => r.verified).length,
          notVerified: results.filter(r => !r.verified).length,
        },
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request', details: error.errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  
  /**
   * Webhook subscription endpoint
   * POST /api/partner/webhooks/subscribe
   */
  static async subscribeWebhook(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json();
      const { apiKey, webhookUrl, events, secret } = WebhookSubscribeSchema.parse(body);
      
      // Validate API key
      const partner = await this.validatePartnerApiKey(apiKey, ['webhooks']);
      if (!partner) {
        return NextResponse.json(
          { error: 'Invalid API key or insufficient permissions' },
          { status: 401 }
        );
      }
      
      // Validate webhook URL is reachable
      const isValid = await this.validateWebhookUrl(webhookUrl);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Webhook URL is not reachable' },
          { status: 400 }
        );
      }
      
      // Create webhook subscription
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          organizationId: partner.organizationId,
          url: webhookUrl,
          events,
          secret,
          active: true,
          type: 'verification_update',
          organizationType: partner.organizationType,
        },
      });
      
      return NextResponse.json({
        webhookId: webhook.id,
        url: webhookUrl,
        events,
        status: 'active',
        message: 'Webhook subscription created successfully',
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request', details: error.errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  
  /**
   * Get API usage statistics
   * GET /api/partner/usage
   */
  static async getUsageStats(req: NextRequest): Promise<NextResponse> {
    try {
      const apiKey = req.headers.get('x-api-key');
      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key required' },
          { status: 401 }
        );
      }
      
      const partner = await this.validatePartnerApiKey(apiKey);
      if (!partner) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      // Get usage statistics
      const [dailyUsage, monthlyUsage, endpoints] = await Promise.all([
        prisma.apiUsage.aggregate({
          where: {
            partnerId: partner.id,
            timestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          _sum: { count: true },
        }),
        prisma.apiUsage.aggregate({
          where: {
            partnerId: partner.id,
            timestamp: {
              gte: new Date(new Date().setDate(1)),
            },
          },
          _sum: { count: true },
        }),
        prisma.apiUsage.groupBy({
          by: ['endpoint'],
          where: {
            partnerId: partner.id,
            timestamp: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
          _sum: { count: true },
        }),
      ]);
      
      return NextResponse.json({
        usage: {
          daily: dailyUsage._sum.count || 0,
          monthly: monthlyUsage._sum.count || 0,
          endpoints: endpoints.map(e => ({
            endpoint: e.endpoint,
            count: e._sum.count,
          })),
        },
        limits: {
          daily: partner.dailyLimit || 10000,
          monthly: partner.monthlyLimit || 250000,
        },
        partner: {
          name: partner.organizationName,
          type: partner.organizationType,
          permissions: partner.permissions,
        },
      });
      
    } catch (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  
  /**
   * Helper: Validate partner API key
   */
  private static async validatePartnerApiKey(
    apiKey: string,
    requiredPermissions?: string[]
  ): Promise<unknown> {
    const partner = await prisma.apiPartner.findUnique({
      where: { apiKey },
      include: { organization: true },
    });
    
    if (!partner || !partner.active) {
      return null;
    }
    
    // Check permissions
    if (requiredPermissions) {
      const hasPermissions = requiredPermissions.every(p => 
        partner.permissions.includes(p)
      );
      if (!hasPermissions) {
        return null;
      }
    }
    
    // Check rate limits
    const usage = await prisma.apiUsage.aggregate({
      where: {
        partnerId: partner.id,
        timestamp: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { count: true },
    });
    
    if (usage._sum.count >= (partner.dailyLimit || 10000)) {
      return null;
    }
    
    return partner;
  }
  
  /**
   * Helper: Track API usage
   */
  private static async trackApiUsage(
    partnerId: string,
    endpoint: string,
    count: number = 1
  ): Promise<void> {
    await prisma.apiUsage.create({
      data: {
        partnerId,
        endpoint,
        count,
        timestamp: new Date(),
      },
    });
  }
  
  /**
   * Helper: Validate webhook URL
   */
  private static async validateWebhookUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Indigenious-Webhook-Validator/1.0',
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default VerificationAPI;