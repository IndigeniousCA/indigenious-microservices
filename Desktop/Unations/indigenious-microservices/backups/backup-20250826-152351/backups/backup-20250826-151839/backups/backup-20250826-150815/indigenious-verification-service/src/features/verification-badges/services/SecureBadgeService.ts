import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { SecureConfig } from '@/lib/secure-config';
import { withTransaction } from '@/lib/database';
import { BadgeGenerationService } from './BadgeGenerationService';
import { APIError, UnauthorizedError, ValidationError, RateLimitError } from '@/lib/errors';

// Input validation schemas
const CreateBadgeSchema = z.object({
  businessId: z.string().uuid('Invalid business ID format'),
  metadata: z.object({
    reason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional()
  }).optional()
});

const VerifyBadgeSchema = z.object({
  publicKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid public key format'),
  temporalProof: z.string().min(100).max(5000),
  blockchainAnchor: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid blockchain anchor')
});

export class SecureBadgeService {
  private badgeService: BadgeGenerationService;
  private rateLimiter: RateLimiter;
  private auditLogger: AuditLogger;
  private secureConfig: SecureConfig;

  constructor() {
    this.rateLimiter = new RateLimiter({
      createBadge: { points: 10, duration: 3600 }, // 10 per hour
      verifyBadge: { points: 100, duration: 60 }, // 100 per minute
      queryBadge: { points: 1000, duration: 60 } // 1000 per minute
    });
    
    this.auditLogger = new AuditLogger();
    this.secureConfig = SecureConfig.getInstance();
  }

  /**
   * Initialize badge service with secure configuration
   */
  private async initializeBadgeService(): Promise<void> {
    if (this.badgeService) return;

    try {
      const [jwtSecret, ethereumRpc, contractAddress] = await Promise.all([
        this.secureConfig.getSecret('BADGE_JWT_SECRET'),
        this.secureConfig.getSecret('ETHEREUM_RPC_URL'),
        this.secureConfig.getSecret('BADGE_CONTRACT_ADDRESS')
      ]);

      this.badgeService = new BadgeGenerationService(
        jwtSecret,
        ethereumRpc,
        contractAddress
      );
    } catch (error) {
      logger.error('Failed to initialize badge service', { error });
      throw new APIError(500, 'SERVICE_INIT_FAILED', 'Service initialization failed');
    }
  }

  /**
   * Create a new badge with full security checks
   */
  async createBadge(
    request: Request,
    input: unknown
  ): Promise<{
    success: boolean;
    badge: any;
    warnings?: string[];
  }> {
    // 1. Authentication check
    const session = await this.requireAuth(request);
    
    // 2. Input validation
    const validatedInput = this.validateInput(CreateBadgeSchema, input);
    
    // 3. Sanitize string inputs
    const sanitizedInput = this.sanitizeInput(validatedInput);
    
    // 4. Rate limiting
    await this.checkRateLimit(session.user.id, 'createBadge');
    
    // 5. Initialize service
    await this.initializeBadgeService();
    
    // 6. Start transaction
    return withTransaction(async (tx) => {
      try {
        // 7. Business authorization check
        const business = await this.authorizeBusinessAccess(
          tx,
          sanitizedInput.businessId,
          session.user.id
        );
        
        // 8. Additional business validations
        await this.validateBusinessEligibility(business);
        
        // 9. Check for existing badge
        const existingBadge = await tx.badge.findUnique({
          where: { businessId: business.id }
        });
        
        if (existingBadge) {
          throw new ValidationError('Business already has a badge');
        }
        
        // 10. Calculate metrics with validation
        const metrics = await this.calculateVerifiedMetrics(tx, business);
        
        // 11. Generate badge data
        const badgeData = {
          businessId: business.id,
          businessName: business.name,
          verificationDate: business.verifiedAt || new Date(),
          indigenousPartnership: {
            communityId: business.nation,
            communityName: business.nation,
            partnershipType: 'VERIFIED'
          },
          metrics
        };
        
        // 12. Generate cryptographic identity
        const identity = await this.badgeService.generateBadgeIdentity(badgeData);
        
        // 13. Generate visual badge
        const visualBadge = this.badgeService.generateVisualBadge(badgeData, identity);
        
        // 14. Save badge with audit trail
        const badge = await tx.badge.create({
          data: {
            businessId: business.id,
            publicKey: identity.publicKey,
            temporalProof: identity.temporalProof,
            indigenousHash: identity.indigenousHash,
            performanceSignature: identity.performanceSignature,
            blockchainAnchor: identity.blockchainAnchor,
            animalSpirit: visualBadge.animal,
            evolutionStage: visualBadge.stage,
            ...metrics,
            status: 'ACTIVE'
          }
        });
        
        // 15. Create audit event
        await tx.badgeAuditEvent.create({
          data: {
            badgeId: badge.id,
            eventType: 'issued',
            eventData: {
              issuedTo: business.name,
              issuedBy: session.user.email,
              metrics,
              metadata: sanitizedInput.metadata
            },
            performedBy: session.user.id,
            performedByType: 'user'
          }
        });
        
        // 16. Log audit trail
        await this.auditLogger.log({
          userId: session.user.id,
          action: 'CREATE_BADGE',
          resourceType: 'badge',
          resourceId: badge.id,
          metadata: {
            businessId: business.id,
            businessName: business.name,
            spirit: visualBadge.animal
          },
          ip: this.getClientIP(request),
          userAgent: request.headers.get('user-agent')
        });
        
        // 17. Return sanitized response
        return {
          success: true,
          badge: {
            id: badge.id,
            businessId: badge.businessId,
            identity: {
              publicKey: identity.publicKey,
              blockchainAnchor: identity.blockchainAnchor
            },
            visual: visualBadge,
            status: badge.status,
            createdAt: badge.createdAt
          },
          warnings: this.generateWarnings(business, metrics)
        };
        
      } catch (error) {
        // 18. Log error with context
        logger.error('Badge creation failed', {
          error,
          userId: session.user.id,
          businessId: sanitizedInput.businessId
        });
        
        throw error;
      }
    });
  }

  /**
   * Verify badge authenticity with security
   */
  async verifyBadge(
    request: Request,
    input: unknown
  ): Promise<{
    isValid: boolean;
    badge?: any;
    verificationDetails?: any;
  }> {
    // 1. Input validation
    const validatedInput = this.validateInput(VerifyBadgeSchema, input);
    
    // 2. Rate limiting (no auth required for verification)
    const clientId = this.getClientIdentifier(request);
    await this.checkRateLimit(clientId, 'verifyBadge');
    
    // 3. Initialize service
    await this.initializeBadgeService();
    
    try {
      // 4. Cryptographic verification
      const isValid = await this.badgeService.verifyBadge(
        validatedInput.publicKey,
        validatedInput.temporalProof,
        validatedInput.blockchainAnchor
      );
      
      if (!isValid) {
        // Log suspicious verification attempt
        await this.auditLogger.log({
          action: 'VERIFY_BADGE_FAILED',
          resourceType: 'badge',
          metadata: {
            publicKey: validatedInput.publicKey,
            reason: 'cryptographic_verification_failed'
          },
          ip: this.getClientIP(request),
          userAgent: request.headers.get('user-agent')
        });
        
        return { isValid: false };
      }
      
      // 5. Fetch badge from database
      const badge = await prisma.badge.findUnique({
        where: { publicKey: validatedInput.publicKey },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              nation: true,
              territory: true,
              indigenousOwnership: true,
              verificationStatus: true
            }
          }
        }
      });
      
      if (!badge) {
        return { isValid: false };
      }
      
      // 6. Check badge status
      if (badge.status !== 'ACTIVE') {
        return {
          isValid: false,
          verificationDetails: {
            reason: `Badge is ${badge.status.toLowerCase()}`
          }
        };
      }
      
      // 7. Update verification timestamp
      await prisma.badge.update({
        where: { id: badge.id },
        data: { lastVerified: new Date() }
      });
      
      // 8. Log successful verification
      await this.auditLogger.log({
        action: 'VERIFY_BADGE_SUCCESS',
        resourceType: 'badge',
        resourceId: badge.id,
        metadata: {
          businessName: badge.business.name
        },
        ip: this.getClientIP(request),
        userAgent: request.headers.get('user-agent')
      });
      
      // 9. Return sanitized response
      return {
        isValid: true,
        badge: {
          id: badge.id,
          animalSpirit: badge.animalSpirit,
          evolutionStage: badge.evolutionStage,
          business: {
            name: badge.business.name,
            nation: badge.business.nation,
            indigenousOwnership: badge.business.indigenousOwnership
          },
          issuedAt: badge.issuedAt,
          lastVerified: badge.lastVerified
        },
        verificationDetails: {
          verifiedAt: new Date(),
          cryptographicValid: true,
          blockchainAnchored: true
        }
      };
      
    } catch (error) {
      logger.error('Badge verification error', { error });
      throw new APIError(500, 'VERIFICATION_FAILED', 'Verification process failed');
    }
  }

  /**
   * Helper methods
   */
  private async requireAuth(request: Request): Promise<any> {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    return session;
  }

  private validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid input', error.errors);
      }
      throw error;
    }
  }

  private sanitizeInput<T>(input: T): T {
    if (typeof input === 'string') {
      return DOMPurify.sanitize(input) as T;
    }
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item)) as T;
    }
    if (input && typeof input === 'object') {
      return Object.entries(input).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: this.sanitizeInput(value)
      }), {}) as T;
    }
    return input;
  }

  private async checkRateLimit(identifier: string, action: string): Promise<void> {
    const allowed = await this.rateLimiter.consume(identifier, action);
    if (!allowed) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }
  }

  private async authorizeBusinessAccess(
    tx: any,
    businessId: string,
    userId: string
  ): Promise<any> {
    const businessMember = await tx.businessMember.findFirst({
      where: {
        businessId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        status: 'ACTIVE'
      },
      include: {
        business: true
      }
    });
    
    if (!businessMember) {
      throw new UnauthorizedError('You do not have permission to manage this business');
    }
    
    return businessMember.business;
  }

  private async validateBusinessEligibility(business: any): Promise<void> {
    const errors = [];
    
    if (business.verificationStatus !== 'VERIFIED') {
      errors.push('Business must be verified');
    }
    
    if (business.indigenousOwnership < 51) {
      errors.push('Business must be at least 51% Indigenous owned');
    }
    
    if (business.status !== 'ACTIVE') {
      errors.push('Business must be active');
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Business not eligible for badge', errors);
    }
  }

  private async calculateVerifiedMetrics(tx: any, business: any): Promise<any> {
    // Secure metric calculation with data validation
    const [contracts, employees] = await Promise.all([
      tx.contract.findMany({
        where: {
          OR: [
            { businessId: business.id },
            { partnerId: business.id }
          ],
          status: 'COMPLETED'
        }
      }),
      tx.businessMember.count({
        where: {
          businessId: business.id,
          status: 'ACTIVE'
        }
      })
    ]);
    
    const totalContractValue = contracts.reduce((sum, c) => 
      sum + (c.value || 0), 0
    );
    
    return {
      procurementPercentage: Math.min(
        (totalContractValue / 10000000) * 100, // Cap at reasonable percentage
        20
      ),
      indigenousEmployment: Math.min(
        business.indigenousEmployeeCount || 0,
        employees // Can't have more Indigenous employees than total
      ),
      communityInvestment: Math.min(
        business.communityInvestment || 0,
        totalContractValue * 0.1 // Cap at 10% of contracts
      ),
      sustainabilityScore: Math.min(
        business.sustainabilityScore || 0.5,
        1.0
      ),
      yearsActive: Math.min(
        new Date().getFullYear() - (business.yearEstablished || new Date().getFullYear()),
        50 // Reasonable cap
      ),
      totalImpactValue: totalContractValue
    };
  }

  private getClientIP(request: Request): string {
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }

  private getClientIdentifier(request: Request): string {
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }

  private generateWarnings(business: any, metrics: any): string[] {
    const warnings = [];
    
    if (metrics.procurementPercentage < 5) {
      warnings.push('Low procurement percentage may limit badge evolution');
    }
    
    if (metrics.indigenousEmployment < 10) {
      warnings.push('Consider increasing Indigenous employment for better badge progression');
    }
    
    return warnings;
  }
}