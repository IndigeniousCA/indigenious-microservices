import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AuditLogger } from '@/lib/audit-logger';
import { SecureConfig } from '@/lib/secure-config';
import { withTransaction } from '@/lib/database';
import { 
  APIError, 
  UnauthorizedError, 
  ValidationError,
  SecurityError 
} from '@/lib/errors';

// Compliance configuration
const COMPLIANCE_CONFIG = {
  // Data retention (days)
  retention: {
    trapData: 90,
    evidenceData: 365 * 7, // 7 years for legal proceedings
    personalData: 30 // GDPR/PIPEDA compliance
  },
  // Legal disclaimers
  disclaimers: {
    honeypot: 'This is a controlled security measure for fraud prevention.',
    evidence: 'Data collected may be used in legal proceedings.',
    privacy: 'Personal data is processed in accordance with privacy laws.'
  },
  // Jurisdictional requirements
  jurisdictions: ['CA', 'US'], // Canada and US only
  // Required approvals
  requiresApproval: true,
  approvalRoles: ['ADMIN', 'LEGAL_TEAM']
};

// Input validation schemas
const CreateTrapSchema = z.object({
  trapType: z.enum(['honeypot', 'timebomb', 'tracker']),
  targetIndustry: z.string().max(100),
  metadata: z.object({
    purpose: z.string().max(500),
    authorizedBy: z.string().email(),
    legalReviewId: z.string().optional(),
    expiresAt: z.date()
  })
});

const DetectionEventSchema = z.object({
  trapBusinessId: z.string().uuid(),
  detectedBusinessId: z.string().uuid(),
  detectionType: z.enum(['registration', 'claim', 'copy']),
  evidence: z.object({
    ipAddress: z.string().ip().optional(),
    timestamp: z.date(),
    details: z.record(z.any())
  })
});

export class SecureTrapBusinessService {
  private auditLogger: AuditLogger;
  private secureConfig: SecureConfig;
  private encryptionKey: Buffer;

  constructor() {
    this.auditLogger = new AuditLogger();
    this.secureConfig = SecureConfig.getInstance();
  }

  /**
   * Initialize encryption key
   */
  private async initializeEncryption(): Promise<void> {
    if (this.encryptionKey) return;
    
    const key = await this.secureConfig.getSecret('TRAP_ENCRYPTION_KEY');
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * Create a trap business with legal compliance
   */
  async createTrapBusiness(
    userId: string,
    input: unknown,
    userRole: string
  ): Promise<{
    success: boolean;
    trapBusiness: any;
    warnings: string[];
  }> {
    // 1. Validate authorization
    if (!COMPLIANCE_CONFIG.approvalRoles.includes(userRole)) {
      throw new UnauthorizedError('Insufficient permissions to create trap businesses');
    }

    // 2. Validate input
    const validatedInput = this.validateInput(CreateTrapSchema, input);
    
    // 3. Legal compliance check
    await this.performComplianceCheck(validatedInput);
    
    // 4. Initialize encryption
    await this.initializeEncryption();

    return withTransaction(async (tx) => {
      try {
        // 5. Generate trap business data
        const trapData = await this.generateSecureTrapData(validatedInput);
        
        // 6. Create trap business with audit trail
        const trapBusiness = await tx.trapBusiness.create({
          data: {
            ...trapData,
            createdBy: userId,
            metadata: this.encryptMetadata(validatedInput.metadata),
            status: 'ACTIVE',
            expiresAt: validatedInput.metadata.expiresAt
          }
        });
        
        // 7. Create forensic markers
        await this.createForensicMarkers(tx, trapBusiness.id);
        
        // 8. Log creation with legal context
        await this.auditLogger.log({
          userId,
          action: 'CREATE_TRAP_BUSINESS',
          resourceType: 'trap_business',
          resourceId: trapBusiness.id,
          metadata: {
            trapType: validatedInput.trapType,
            purpose: validatedInput.metadata.purpose,
            legalReviewId: validatedInput.metadata.legalReviewId,
            compliance: COMPLIANCE_CONFIG.disclaimers
          },
          securityLevel: 'HIGH'
        });
        
        // 9. Schedule automatic cleanup
        await this.scheduleCleanup(trapBusiness.id, validatedInput.metadata.expiresAt);
        
        return {
          success: true,
          trapBusiness: this.sanitizeTrapResponse(trapBusiness),
          warnings: this.generateComplianceWarnings(validatedInput)
        };
        
      } catch (error) {
        logger.error('Trap business creation failed', {
          error,
          userId,
          trapType: validatedInput.trapType
        });
        throw error;
      }
    });
  }

  /**
   * Record detection event with evidence preservation
   */
  async recordDetection(
    input: unknown,
    request?: Request
  ): Promise<{
    success: boolean;
    detectionId: string;
    evidencePackage: any;
  }> {
    // 1. Validate input
    const validatedInput = this.validateInput(DetectionEventSchema, input);
    
    // 2. Initialize encryption
    await this.initializeEncryption();
    
    return withTransaction(async (tx) => {
      try {
        // 3. Verify trap is active
        const trap = await tx.trapBusiness.findUnique({
          where: { id: validatedInput.trapBusinessId }
        });
        
        if (!trap || trap.status !== 'ACTIVE') {
          throw new ValidationError('Invalid or inactive trap');
        }
        
        // 4. Collect forensic evidence
        const forensicData = await this.collectForensicEvidence(
          validatedInput,
          request
        );
        
        // 5. Create detection record with encryption
        const detection = await tx.trapDetection.create({
          data: {
            trapBusinessId: validatedInput.trapBusinessId,
            detectedBusinessId: validatedInput.detectedBusinessId,
            detectionType: validatedInput.detectionType,
            forensicData: this.encryptEvidence(forensicData),
            evidenceHash: this.hashEvidence(forensicData),
            timestamp: new Date(),
            status: 'PENDING_REVIEW'
          }
        });
        
        // 6. Generate tamper-proof evidence package
        const evidencePackage = await this.generateEvidencePackage(
          detection,
          forensicData
        );
        
        // 7. Notify legal team
        await this.notifyLegalTeam(detection, evidencePackage);
        
        // 8. Log with chain of custody
        await this.auditLogger.log({
          action: 'TRAP_DETECTION',
          resourceType: 'trap_detection',
          resourceId: detection.id,
          metadata: {
            trapId: validatedInput.trapBusinessId,
            detectedBusinessId: validatedInput.detectedBusinessId,
            detectionType: validatedInput.detectionType,
            evidenceHash: detection.evidenceHash
          },
          securityLevel: 'CRITICAL'
        });
        
        return {
          success: true,
          detectionId: detection.id,
          evidencePackage: this.sanitizeEvidencePackage(evidencePackage)
        };
        
      } catch (error) {
        logger.error('Detection recording failed', { error });
        throw error;
      }
    });
  }

  /**
   * Query trap detections with privacy protection
   */
  async queryDetections(
    userId: string,
    userRole: string,
    filters?: any
  ): Promise<any[]> {
    // Only authorized roles can query
    if (!COMPLIANCE_CONFIG.approvalRoles.includes(userRole)) {
      throw new UnauthorizedError('Insufficient permissions to query detections');
    }
    
    const detections = await prisma.trapDetection.findMany({
      where: {
        ...filters,
        // Respect data retention
        timestamp: {
          gte: new Date(Date.now() - COMPLIANCE_CONFIG.retention.trapData * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        trapBusiness: {
          select: {
            id: true,
            businessName: true,
            trapType: true
          }
        },
        detectedBusiness: {
          select: {
            id: true,
            name: true,
            indigenousClaim: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit results
    });
    
    // Decrypt evidence for authorized users
    return detections.map(d => ({
      ...d,
      forensicData: this.decryptEvidence(d.forensicData),
      privacyNotice: COMPLIANCE_CONFIG.disclaimers.privacy
    }));
  }

  /**
   * Helper methods
   */
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

  private async performComplianceCheck(input: any): Promise<void> {
    // Check legal review
    if (!input.metadata.legalReviewId) {
      logger.warn('Trap business created without legal review', {
        purpose: input.metadata.purpose
      });
    }
    
    // Check jurisdiction
    const userJurisdiction = await this.getUserJurisdiction();
    if (!COMPLIANCE_CONFIG.jurisdictions.includes(userJurisdiction)) {
      throw new SecurityError('Operation not permitted in this jurisdiction');
    }
    
    // Check data retention compliance
    const retentionDays = Math.floor(
      (input.metadata.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    
    if (retentionDays > COMPLIANCE_CONFIG.retention.trapData) {
      throw new ValidationError(
        `Trap data retention cannot exceed ${COMPLIANCE_CONFIG.retention.trapData} days`
      );
    }
  }

  private async generateSecureTrapData(input: any): Promise<any> {
    const trapId = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Generate unique markers
    const markers = {
      cssMarker: `trap-${trapId}-${timestamp}`,
      metaTag: `<meta name="trap-id" content="${trapId}">`,
      invisiblePixel: `/api/trap/pixel/${trapId}.gif`,
      jsBeacon: `window.trapId="${trapId}"`
    };
    
    // Generate fake but realistic business data
    const businessData = {
      id: trapId,
      businessName: this.generateTrapName(input.trapType),
      businessNumber: this.generateTrapBusinessNumber(),
      indigenousClaim: true,
      nation: 'Trap Nation (Test)',
      territory: 'Test Territory',
      description: 'This is a security honeypot for fraud detection.',
      industries: [input.targetIndustry],
      website: `https://trap-${trapId}.example.com`,
      markers
    };
    
    return businessData;
  }

  private createForensicMarkers(tx: any, trapId: string): Promise<any> {
    // Create multiple forensic markers for evidence
    return tx.forensicMarker.createMany({
      data: [
        {
          trapBusinessId: trapId,
          markerType: 'css_class',
          markerValue: `trap-${trapId}`,
          isActive: true
        },
        {
          trapBusinessId: trapId,
          markerType: 'meta_tag',
          markerValue: `trap-id-${trapId}`,
          isActive: true
        },
        {
          trapBusinessId: trapId,
          markerType: 'tracking_pixel',
          markerValue: `/api/trap/pixel/${trapId}.gif`,
          isActive: true
        }
      ]
    });
  }

  private async collectForensicEvidence(
    detection: any,
    request?: Request
  ): Promise<any> {
    const evidence: any = {
      timestamp: new Date(),
      detectionType: detection.detectionType,
      trapBusinessId: detection.trapBusinessId,
      detectedBusinessId: detection.detectedBusinessId
    };
    
    if (request) {
      // Collect request metadata (with privacy considerations)
      evidence.request = {
        ip: this.hashIP(request.headers.get('x-forwarded-for') || 'unknown'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        timestamp: new Date()
      };
    }
    
    // Add cryptographic proof
    evidence.proof = {
      hash: crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
      timestamp: Date.now(),
      version: '1.0'
    };
    
    return evidence;
  }

  private encryptMetadata(metadata: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(JSON.stringify(metadata), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    });
  }

  private encryptEvidence(evidence: any): string {
    return this.encryptMetadata(evidence);
  }

  private decryptEvidence(encryptedData: string): any {
    if (!encryptedData) return null;
    
    try {
      const { iv, authTag, data } = JSON.parse(encryptedData);
      
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Evidence decryption failed', { error });
      return null;
    }
  }

  private hashEvidence(evidence: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(evidence))
      .digest('hex');
  }

  private hashIP(ip: string): string {
    // Hash IP for privacy while maintaining uniqueness
    return crypto
      .createHash('sha256')
      .update(ip + process.env.IP_SALT)
      .digest('hex')
      .substring(0, 16);
  }

  private async generateEvidencePackage(
    detection: any,
    forensicData: any
  ): Promise<any> {
    return {
      detectionId: detection.id,
      timestamp: detection.timestamp,
      evidenceHash: detection.evidenceHash,
      forensicData,
      chainOfCustody: [
        {
          timestamp: new Date(),
          action: 'EVIDENCE_COLLECTED',
          hash: detection.evidenceHash
        }
      ],
      legalNotice: COMPLIANCE_CONFIG.disclaimers.evidence
    };
  }

  private async notifyLegalTeam(detection: any, evidencePackage: any): Promise<void> {
    // Queue notification to legal team
    logger.info('Legal team notification queued', {
      detectionId: detection.id,
      detectionType: detection.detectionType
    });
    
    // TODO: Implement actual notification system
  }

  private sanitizeTrapResponse(trap: any): any {
    return {
      id: trap.id,
      businessName: trap.businessName,
      trapType: trap.trapType,
      status: trap.status,
      expiresAt: trap.expiresAt,
      compliance: COMPLIANCE_CONFIG.disclaimers.honeypot
    };
  }

  private sanitizeEvidencePackage(evidencePackage: any): any {
    // Remove sensitive data from public response
    return {
      detectionId: evidencePackage.detectionId,
      timestamp: evidencePackage.timestamp,
      evidenceHash: evidencePackage.evidenceHash,
      legalNotice: evidencePackage.legalNotice
    };
  }

  private generateComplianceWarnings(input: any): string[] {
    const warnings = [];
    
    if (!input.metadata.legalReviewId) {
      warnings.push('Operating without formal legal review');
    }
    
    warnings.push(COMPLIANCE_CONFIG.disclaimers.honeypot);
    warnings.push(COMPLIANCE_CONFIG.disclaimers.privacy);
    
    return warnings;
  }

  private async getUserJurisdiction(): Promise<string> {
    // TODO: Implement actual jurisdiction detection
    return 'CA'; // Default to Canada
  }

  private generateTrapName(trapType: string): string {
    const prefixes = {
      honeypot: ['Northern', 'First', 'Indigenous'],
      timebomb: ['Traditional', 'Native', 'Authentic'],
      tracker: ['Community', 'Nation', 'Territory']
    };
    
    const suffixes = ['Enterprises', 'Solutions', 'Services', 'Group'];
    
    const prefix = prefixes[trapType][Math.floor(Math.random() * prefixes[trapType].length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} Test ${suffix} (Honeypot)`;
  }

  private generateTrapBusinessNumber(): string {
    // Generate realistic but invalid business number
    return `TRAP${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  private async scheduleCleanup(trapId: string, expiresAt: Date): Promise<void> {
    // Schedule automatic cleanup for compliance
    logger.info('Trap cleanup scheduled', {
      trapId,
      expiresAt
    });
    
    // TODO: Implement job scheduler
  }
}