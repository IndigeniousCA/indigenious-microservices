import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import crypto from 'crypto';
import dayjs from 'dayjs';
import {
  Certification,
  CertificationType,
  CertificationStatus,
  VerificationResult,
  CreateCertificationData,
  UpdateCertificationData,
} from '../types/certification.types';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { DocumentValidationService } from './document-validation.service';
import { BlockchainService } from './blockchain.service';

export class CertificationService {
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly VERIFICATION_CACHE_TTL = 86400; // 24 hours

  /**
   * Create new certification
   */
  static async createCertification(data: CreateCertificationData): Promise<Certification> {
    try {
      const certificationId = uuidv4();
      const certificationNumber = this.generateCertificationNumber(data.type);

      // Validate supporting documents
      const documentValidation = await DocumentValidationService.validateDocuments(
        data.supportingDocuments
      );

      if (!documentValidation.valid) {
        throw new Error(`Document validation failed: ${documentValidation.errors.join(', ')}`);
      }

      // Verify with external registries
      const externalVerification = await this.verifyWithExternalSources({
        businessName: data.businessName,
        businessNumber: data.businessNumber,
        bandNumber: data.bandNumber,
        type: data.type,
      });

      // Create certification record
      const certification = await prisma.certification.create({
        data: {
          id: certificationId,
          certificationNumber,
          businessId: data.businessId,
          businessName: data.businessName,
          businessNumber: data.businessNumber,
          type: data.type,
          status: CertificationStatus.PENDING,
          issuedBy: data.issuedBy,
          validFrom: new Date(),
          validUntil: dayjs().add(1, 'year').toDate(),
          metadata: {
            bandNumber: data.bandNumber,
            bandName: data.bandName,
            region: data.region,
            indigenousGroup: data.indigenousGroup,
            ownership: data.ownershipPercentage,
            externalVerification,
            documentValidation,
          },
          supportingDocuments: data.supportingDocuments,
          verificationHash: this.generateVerificationHash(certificationNumber),
        },
      });

      // Create audit trail
      await AuditService.logCertificationCreated({
        certificationId,
        businessId: data.businessId,
        type: data.type,
        createdBy: data.issuedBy,
      });

      // Store on blockchain for immutability
      if (process.env.ENABLE_BLOCKCHAIN === 'true') {
        await BlockchainService.storeCertification({
          certificationNumber,
          businessName: data.businessName,
          type: data.type,
          validUntil: certification.validUntil,
          hash: certification.verificationHash,
        });
      }

      // Cache certification
      await this.cacheCertification(certification);

      logger.info('Certification created', {
        certificationId,
        certificationNumber,
        type: data.type,
        businessId: data.businessId,
      });

      return this.formatCertification(certification);
    } catch (error) {
      logger.error('Failed to create certification', error);
      throw error;
    }
  }

  /**
   * Verify certification
   */
  static async verifyCertification(
    certificationNumber: string
  ): Promise<VerificationResult> {
    try {
      // Check cache first
      const cached = await redis.get(`verification:${certificationNumber}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get certification from database
      const certification = await prisma.certification.findUnique({
        where: { certificationNumber },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              verified: true,
            },
          },
        },
      });

      if (!certification) {
        return {
          valid: false,
          message: 'Certification not found',
          certificationNumber,
        };
      }

      // Check expiry
      const isExpired = dayjs().isAfter(certification.validUntil);
      if (isExpired) {
        return {
          valid: false,
          message: 'Certification has expired',
          certificationNumber,
          expiredOn: certification.validUntil,
        };
      }

      // Check revocation status
      if (certification.status === CertificationStatus.REVOKED) {
        return {
          valid: false,
          message: 'Certification has been revoked',
          certificationNumber,
          revokedOn: certification.revokedAt,
        };
      }

      // Verify hash integrity
      const expectedHash = this.generateVerificationHash(certificationNumber);
      if (certification.verificationHash !== expectedHash) {
        await AuditService.logSuspiciousActivity({
          type: 'HASH_MISMATCH',
          certificationNumber,
          details: 'Verification hash mismatch detected',
        });

        return {
          valid: false,
          message: 'Certification integrity check failed',
          certificationNumber,
        };
      }

      // Additional CCAB verification for Indigenous certifications
      if (certification.type === CertificationType.INDIGENOUS_BUSINESS) {
        const ccabValid = await this.verifyCCAB(certification.metadata?.ccabNumber);
        if (!ccabValid) {
          return {
            valid: false,
            message: 'CCAB verification failed',
            certificationNumber,
          };
        }
      }

      // Log successful verification
      await AuditService.logVerification({
        certificationNumber,
        verified: true,
        timestamp: new Date(),
      });

      const result: VerificationResult = {
        valid: true,
        certificationNumber,
        businessName: certification.businessName,
        type: certification.type,
        issuedOn: certification.validFrom,
        expiresOn: certification.validUntil,
        issuedBy: certification.issuedBy,
        metadata: {
          bandNumber: certification.metadata?.bandNumber,
          bandName: certification.metadata?.bandName,
          indigenousGroup: certification.metadata?.indigenousGroup,
          ownershipPercentage: certification.metadata?.ownership,
        },
      };

      // Cache verification result
      await redis.setex(
        `verification:${certificationNumber}`,
        this.VERIFICATION_CACHE_TTL,
        JSON.stringify(result)
      );

      return result;
    } catch (error) {
      logger.error('Failed to verify certification', error);
      throw error;
    }
  }

  /**
   * Update certification
   */
  static async updateCertification(
    certificationId: string,
    updates: UpdateCertificationData,
    updatedBy: string
  ): Promise<Certification> {
    try {
      const existing = await prisma.certification.findUnique({
        where: { id: certificationId },
      });

      if (!existing) {
        throw new Error('Certification not found');
      }

      // Validate updates
      if (updates.status === CertificationStatus.REVOKED && !updates.revocationReason) {
        throw new Error('Revocation reason required');
      }

      const certification = await prisma.certification.update({
        where: { id: certificationId },
        data: {
          ...updates,
          ...(updates.status === CertificationStatus.REVOKED && {
            revokedAt: new Date(),
            revokedBy: updatedBy,
          }),
          updatedAt: new Date(),
        },
      });

      // Create audit trail
      await AuditService.logCertificationUpdated({
        certificationId,
        updates,
        updatedBy,
      });

      // Notify business of status change
      if (updates.status) {
        await NotificationService.notifyCertificationStatusChange({
          businessId: certification.businessId,
          certificationNumber: certification.certificationNumber,
          newStatus: updates.status,
          reason: updates.revocationReason,
        });
      }

      // Invalidate cache
      await redis.del(`certification:${certificationId}`);
      await redis.del(`verification:${certification.certificationNumber}`);

      return this.formatCertification(certification);
    } catch (error) {
      logger.error('Failed to update certification', error);
      throw error;
    }
  }

  /**
   * Renew certification
   */
  static async renewCertification(
    certificationId: string,
    renewalData: {
      supportingDocuments: string[];
      renewedBy: string;
    }
  ): Promise<Certification> {
    try {
      const existing = await prisma.certification.findUnique({
        where: { id: certificationId },
      });

      if (!existing) {
        throw new Error('Certification not found');
      }

      // Check if eligible for renewal
      const daysUntilExpiry = dayjs(existing.validUntil).diff(dayjs(), 'days');
      if (daysUntilExpiry > 90) {
        throw new Error('Certification can only be renewed within 90 days of expiry');
      }

      // Validate renewal documents
      const documentValidation = await DocumentValidationService.validateDocuments(
        renewalData.supportingDocuments
      );

      if (!documentValidation.valid) {
        throw new Error('Document validation failed for renewal');
      }

      // Create renewal record
      const renewalId = uuidv4();
      await prisma.certificationRenewal.create({
        data: {
          id: renewalId,
          certificationId,
          renewedBy: renewalData.renewedBy,
          previousValidUntil: existing.validUntil,
          newValidUntil: dayjs(existing.validUntil).add(1, 'year').toDate(),
          supportingDocuments: renewalData.supportingDocuments,
        },
      });

      // Update certification
      const renewed = await prisma.certification.update({
        where: { id: certificationId },
        data: {
          validUntil: dayjs(existing.validUntil).add(1, 'year').toDate(),
          lastRenewalDate: new Date(),
          renewalCount: { increment: 1 },
        },
      });

      // Create audit trail
      await AuditService.logCertificationRenewed({
        certificationId,
        renewalId,
        renewedBy: renewalData.renewedBy,
      });

      // Notify business
      await NotificationService.notifyCertificationRenewal({
        businessId: renewed.businessId,
        certificationNumber: renewed.certificationNumber,
        newExpiryDate: renewed.validUntil,
      });

      return this.formatCertification(renewed);
    } catch (error) {
      logger.error('Failed to renew certification', error);
      throw error;
    }
  }

  /**
   * Get certifications for business
   */
  static async getBusinessCertifications(
    businessId: string,
    includeExpired: boolean = false
  ): Promise<Certification[]> {
    try {
      const where: any = { businessId };
      
      if (!includeExpired) {
        where.validUntil = { gte: new Date() };
        where.status = { not: CertificationStatus.REVOKED };
      }

      const certifications = await prisma.certification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return certifications.map(cert => this.formatCertification(cert));
    } catch (error) {
      logger.error('Failed to get business certifications', error);
      throw error;
    }
  }

  /**
   * Verify with CCAB (Canadian Council for Aboriginal Business)
   */
  private static async verifyCCAB(ccabNumber?: string): Promise<boolean> {
    if (!ccabNumber) return true; // Skip if no CCAB number provided

    try {
      // In production, this would call the actual CCAB API
      const response = await axios.get(
        `${process.env.CCAB_API_URL}/verify/${ccabNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CCAB_API_KEY}`,
          },
          timeout: 5000,
        }
      );

      return response.data.valid === true;
    } catch (error) {
      logger.error('CCAB verification failed', error);
      // Don't fail certification if CCAB is unavailable
      return true;
    }
  }

  /**
   * Verify with external sources
   */
  private static async verifyWithExternalSources(data: {
    businessName: string;
    businessNumber: string;
    bandNumber?: string;
    type: CertificationType;
  }): Promise<any> {
    const verifications: any = {};

    try {
      // Verify with government business registry
      if (data.businessNumber) {
        verifications.businessRegistry = await this.verifyBusinessRegistry(
          data.businessNumber
        );
      }

      // Verify Indigenous status with ISC (Indigenous Services Canada)
      if (data.bandNumber && data.type === CertificationType.INDIGENOUS_BUSINESS) {
        verifications.indigenousStatus = await this.verifyIndigenousStatus(
          data.bandNumber
        );
      }

      // Verify minority-owned status if applicable
      if (data.type === CertificationType.MINORITY_OWNED) {
        verifications.minorityOwned = await this.verifyMinorityOwned(
          data.businessNumber
        );
      }

      return verifications;
    } catch (error) {
      logger.error('External verification failed', error);
      return verifications;
    }
  }

  /**
   * Verify business registry
   */
  private static async verifyBusinessRegistry(businessNumber: string): Promise<any> {
    try {
      // Simulate government registry API call
      // In production, this would call actual government APIs
      const response = await axios.post(
        `${process.env.GOV_REGISTRY_API_URL}/verify`,
        { businessNumber },
        {
          headers: {
            'X-API-Key': process.env.GOV_REGISTRY_API_KEY,
          },
          timeout: 10000,
        }
      );

      return {
        valid: response.data.valid,
        businessName: response.data.businessName,
        status: response.data.status,
        registrationDate: response.data.registrationDate,
      };
    } catch (error) {
      logger.error('Business registry verification failed', error);
      return { valid: false, error: 'Unable to verify' };
    }
  }

  /**
   * Verify Indigenous status
   */
  private static async verifyIndigenousStatus(bandNumber: string): Promise<any> {
    try {
      // Simulate ISC API call
      // In production, this would call actual ISC APIs
      const response = await axios.get(
        `${process.env.ISC_API_URL}/bands/${bandNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.ISC_API_TOKEN}`,
          },
          timeout: 10000,
        }
      );

      return {
        valid: response.data.valid,
        bandName: response.data.bandName,
        region: response.data.region,
        treaty: response.data.treaty,
      };
    } catch (error) {
      logger.error('Indigenous status verification failed', error);
      return { valid: false, error: 'Unable to verify' };
    }
  }

  /**
   * Verify minority-owned status
   */
  private static async verifyMinorityOwned(businessNumber: string): Promise<any> {
    try {
      // Simulate minority certification API
      const response = await axios.post(
        `${process.env.MINORITY_CERT_API_URL}/verify`,
        { businessNumber },
        {
          headers: {
            'X-API-Key': process.env.MINORITY_CERT_API_KEY,
          },
          timeout: 10000,
        }
      );

      return {
        valid: response.data.valid,
        certificationBody: response.data.certificationBody,
        expiryDate: response.data.expiryDate,
      };
    } catch (error) {
      logger.error('Minority-owned verification failed', error);
      return { valid: false, error: 'Unable to verify' };
    }
  }

  /**
   * Generate certification number
   */
  private static generateCertificationNumber(type: CertificationType): string {
    const prefix = {
      [CertificationType.INDIGENOUS_BUSINESS]: 'IND',
      [CertificationType.MINORITY_OWNED]: 'MIN',
      [CertificationType.WOMEN_OWNED]: 'WOM',
      [CertificationType.VETERAN_OWNED]: 'VET',
      [CertificationType.DISABILITY_OWNED]: 'DIS',
      [CertificationType.LGBTQ_OWNED]: 'LGBT',
      [CertificationType.GENERAL]: 'GEN',
    };

    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    return `${prefix[type]}-${year}-${random}`;
  }

  /**
   * Generate verification hash
   */
  private static generateVerificationHash(certificationNumber: string): string {
    const secret = process.env.CERTIFICATION_SECRET || 'default-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(certificationNumber)
      .digest('hex');
  }

  /**
   * Public verification (no auth required)
   */
  static async publicVerification(certificationNumber: string): Promise<any> {
    try {
      const result = await this.verifyCertification(certificationNumber);
      
      // Return limited information for public verification
      if (result.valid) {
        return {
          valid: true,
          businessName: result.businessName,
          type: result.type,
          expiresOn: result.expiresOn,
          verificationUrl: `${process.env.APP_URL}/verify/${certificationNumber}`,
        };
      }

      return {
        valid: false,
        message: result.message,
      };
    } catch (error) {
      logger.error('Public verification failed', error);
      return {
        valid: false,
        message: 'Verification failed',
      };
    }
  }

  /**
   * Check certification expiry
   */
  static async checkExpiringCertifications(): Promise<void> {
    try {
      // Find certifications expiring in 30 days
      const thirtyDaysFromNow = dayjs().add(30, 'days').toDate();
      
      const expiringCertifications = await prisma.certification.findMany({
        where: {
          validUntil: {
            gte: new Date(),
            lte: thirtyDaysFromNow,
          },
          status: CertificationStatus.ACTIVE,
          expiryNotificationSent: false,
        },
      });

      for (const cert of expiringCertifications) {
        // Send expiry notification
        await NotificationService.notifyCertificationExpiry({
          businessId: cert.businessId,
          certificationNumber: cert.certificationNumber,
          expiryDate: cert.validUntil,
          daysRemaining: dayjs(cert.validUntil).diff(dayjs(), 'days'),
        });

        // Mark notification as sent
        await prisma.certification.update({
          where: { id: cert.id },
          data: { expiryNotificationSent: true },
        });
      }

      logger.info(`Checked ${expiringCertifications.length} expiring certifications`);
    } catch (error) {
      logger.error('Failed to check expiring certifications', error);
    }
  }

  /**
   * Cache certification
   */
  private static async cacheCertification(certification: any): Promise<void> {
    try {
      await redis.setex(
        `certification:${certification.id}`,
        this.CACHE_TTL,
        JSON.stringify(certification)
      );
    } catch (error) {
      logger.error('Failed to cache certification', error);
    }
  }

  /**
   * Format certification for response
   */
  private static formatCertification(certification: any): Certification {
    return {
      id: certification.id,
      certificationNumber: certification.certificationNumber,
      businessId: certification.businessId,
      businessName: certification.businessName,
      businessNumber: certification.businessNumber,
      type: certification.type,
      status: certification.status,
      issuedBy: certification.issuedBy,
      validFrom: certification.validFrom,
      validUntil: certification.validUntil,
      metadata: certification.metadata,
      supportingDocuments: certification.supportingDocuments,
      lastRenewalDate: certification.lastRenewalDate,
      renewalCount: certification.renewalCount,
      createdAt: certification.createdAt,
      updatedAt: certification.updatedAt,
    };
  }
}

export default CertificationService;