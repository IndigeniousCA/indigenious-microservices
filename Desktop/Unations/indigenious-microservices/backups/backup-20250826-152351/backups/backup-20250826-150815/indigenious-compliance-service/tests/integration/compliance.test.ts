import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server';
import { CertificationService } from '../../src/services/certification.service';
import { AuditService } from '../../src/services/audit.service';
import { 
  CertificationType, 
  CertificationStatus 
} from '../../src/types/certification.types';
import { AuditEventType, AuditSeverity } from '../../src/types/audit.types';
import jwt from 'jsonwebtoken';

describe('Compliance Service Integration Tests', () => {
  let authToken: string;
  let adminToken: string;
  const businessId = 'business-123';
  const userId = 'user-123';

  beforeAll(() => {
    // Generate auth tokens
    authToken = jwt.sign(
      { userId, businessId, role: 'business_owner' },
      process.env.JWT_SECRET || 'test-secret'
    );
    adminToken = jwt.sign(
      { userId: 'admin-123', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Certification Management', () => {
    describe('POST /api/v1/certifications', () => {
      it('should create Indigenous business certification', async () => {
        const certificationData = {
          businessId,
          businessName: 'Indigenous Test Business',
          businessNumber: 'BN123456789',
          type: CertificationType.INDIGENOUS_BUSINESS,
          issuedBy: userId,
          bandNumber: '123',
          bandName: 'Test First Nation',
          region: 'Ontario',
          indigenousGroup: 'First Nations',
          ownershipPercentage: 51,
          supportingDocuments: ['doc1.pdf', 'doc2.pdf'],
        };

        const response = await request(app)
          .post('/api/v1/certifications')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(certificationData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('certificationNumber');
        expect(response.body.type).toBe(CertificationType.INDIGENOUS_BUSINESS);
        expect(response.body.status).toBe(CertificationStatus.PENDING);
      });

      it('should validate required documents', async () => {
        const certificationData = {
          businessId,
          businessName: 'Test Business',
          businessNumber: 'BN987654321',
          type: CertificationType.INDIGENOUS_BUSINESS,
          issuedBy: userId,
          supportingDocuments: [], // Missing documents
        };

        const response = await request(app)
          .post('/api/v1/certifications')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(certificationData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('documents');
      });

      it('should enforce role-based access control', async () => {
        const certificationData = {
          businessId,
          businessName: 'Test Business',
          businessNumber: 'BN111111111',
          type: CertificationType.GENERAL,
          issuedBy: userId,
        };

        const response = await request(app)
          .post('/api/v1/certifications')
          .set('Authorization', `Bearer ${authToken}`) // Non-admin user
          .send(certificationData);

        expect(response.status).toBe(403);
      });
    });

    describe('GET /api/v1/certifications/verify/:certificationNumber', () => {
      it('should verify valid certification', async () => {
        // Mock certification
        jest.spyOn(CertificationService, 'verifyCertification').mockResolvedValue({
          valid: true,
          certificationNumber: 'IND-2024-123456',
          businessName: 'Test Indigenous Business',
          type: CertificationType.INDIGENOUS_BUSINESS,
          issuedOn: new Date('2024-01-01'),
          expiresOn: new Date('2025-01-01'),
          issuedBy: 'CCAB',
          metadata: {
            bandNumber: '123',
            bandName: 'Test First Nation',
          },
        });

        const response = await request(app)
          .get('/api/v1/certifications/verify/IND-2024-123456')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(true);
        expect(response.body.businessName).toBe('Test Indigenous Business');
      });

      it('should detect expired certifications', async () => {
        jest.spyOn(CertificationService, 'verifyCertification').mockResolvedValue({
          valid: false,
          certificationNumber: 'IND-2023-999999',
          message: 'Certification has expired',
          expiredOn: new Date('2023-12-31'),
        });

        const response = await request(app)
          .get('/api/v1/certifications/verify/IND-2023-999999')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(false);
        expect(response.body.message).toContain('expired');
      });

      it('should detect revoked certifications', async () => {
        jest.spyOn(CertificationService, 'verifyCertification').mockResolvedValue({
          valid: false,
          certificationNumber: 'IND-2024-888888',
          message: 'Certification has been revoked',
          revokedOn: new Date('2024-06-01'),
        });

        const response = await request(app)
          .get('/api/v1/certifications/verify/IND-2024-888888')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(false);
        expect(response.body.message).toContain('revoked');
      });
    });

    describe('PUT /api/v1/certifications/:id/renew', () => {
      it('should renew certification within 90 days of expiry', async () => {
        const certificationId = 'cert-123';
        const renewalData = {
          supportingDocuments: ['renewal1.pdf', 'renewal2.pdf'],
          renewedBy: userId,
        };

        jest.spyOn(CertificationService, 'renewCertification').mockResolvedValue({
          id: certificationId,
          certificationNumber: 'IND-2024-123456',
          businessId,
          businessName: 'Test Business',
          businessNumber: 'BN123456789',
          type: CertificationType.INDIGENOUS_BUSINESS,
          status: CertificationStatus.ACTIVE,
          issuedBy: 'CCAB',
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2026-01-01'), // Extended by 1 year
          supportingDocuments: renewalData.supportingDocuments,
          lastRenewalDate: new Date(),
          renewalCount: 1,
          createdAt: new Date('2024-01-01'),
        });

        const response = await request(app)
          .put(`/api/v1/certifications/${certificationId}/renew`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(renewalData);

        expect(response.status).toBe(200);
        expect(response.body.validUntil).toBeDefined();
        expect(response.body.renewalCount).toBe(1);
      });

      it('should prevent early renewal', async () => {
        const certificationId = 'cert-456';
        
        jest.spyOn(CertificationService, 'renewCertification').mockRejectedValue(
          new Error('Certification can only be renewed within 90 days of expiry')
        );

        const response = await request(app)
          .put(`/api/v1/certifications/${certificationId}/renew`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            supportingDocuments: ['doc.pdf'],
            renewedBy: userId,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('90 days');
      });
    });
  });

  describe('Audit Trail Management', () => {
    describe('POST /api/v1/audit/logs', () => {
      it('should create audit log with integrity hash', async () => {
        const auditData = {
          eventType: AuditEventType.CERTIFICATION_CREATED,
          severity: AuditSeverity.INFO,
          userId,
          businessId,
          entityType: 'certification',
          entityId: 'cert-123',
          action: 'CREATE',
          details: 'Created Indigenous business certification',
          metadata: { type: 'INDIGENOUS_BUSINESS' },
        };

        jest.spyOn(AuditService, 'createAuditLog').mockResolvedValue({
          id: 'audit-123',
          ...auditData,
          hash: 'abc123def456',
          timestamp: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        });

        const response = await request(app)
          .post('/api/v1/audit/logs')
          .set('Authorization', `Bearer ${authToken}`)
          .send(auditData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('hash');
        expect(response.body.eventType).toBe(AuditEventType.CERTIFICATION_CREATED);
      });

      it('should flag suspicious activities', async () => {
        const suspiciousData = {
          eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
          severity: AuditSeverity.CRITICAL,
          userId: 'suspicious-user',
          entityType: 'security',
          entityId: 'cert-999',
          action: 'ALERT',
          details: 'Multiple failed verification attempts',
          metadata: { attempts: 10 },
        };

        const response = await request(app)
          .post('/api/v1/audit/logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(suspiciousData);

        expect(response.status).toBe(201);
        expect(response.body.severity).toBe(AuditSeverity.CRITICAL);
      });
    });

    describe('GET /api/v1/audit/logs', () => {
      it('should retrieve audit logs with filters', async () => {
        jest.spyOn(AuditService, 'getAuditLogs').mockResolvedValue({
          logs: [
            {
              id: 'audit-1',
              eventType: AuditEventType.CERTIFICATION_CREATED,
              severity: AuditSeverity.INFO,
              userId,
              businessId,
              entityType: 'certification',
              entityId: 'cert-1',
              action: 'CREATE',
              details: 'Test log 1',
              hash: 'hash1',
              timestamp: new Date(),
            },
            {
              id: 'audit-2',
              eventType: AuditEventType.VERIFICATION_ATTEMPT,
              severity: AuditSeverity.INFO,
              userId,
              businessId,
              entityType: 'certification',
              entityId: 'cert-2',
              action: 'VERIFY',
              details: 'Test log 2',
              hash: 'hash2',
              timestamp: new Date(),
            },
          ],
          total: 2,
        });

        const response = await request(app)
          .get('/api/v1/audit/logs')
          .query({
            eventType: AuditEventType.CERTIFICATION_CREATED,
            businessId,
            limit: 10,
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.logs).toHaveLength(2);
        expect(response.body.total).toBe(2);
      });

      it('should verify audit log integrity', async () => {
        const auditId = 'audit-123';
        
        jest.spyOn(AuditService, 'verifyAuditIntegrity').mockResolvedValue(true);

        const response = await request(app)
          .get(`/api/v1/audit/logs/${auditId}/verify`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(true);
      });
    });

    describe('POST /api/v1/audit/reports', () => {
      it('should generate compliance audit report', async () => {
        const reportRequest = {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          businessId,
          includeStatistics: true,
          groupBy: 'month',
        };

        jest.spyOn(AuditService, 'generateAuditReport').mockResolvedValue({
          reportId: 'report-123',
          generatedAt: new Date(),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          totalEvents: 150,
          logs: [],
          statistics: {
            byEventType: {
              CERTIFICATION_CREATED: 10,
              VERIFICATION_ATTEMPT: 140,
            },
            bySeverity: {
              INFO: 145,
              WARNING: 5,
            },
          },
          filters: reportRequest,
        });

        const response = await request(app)
          .post('/api/v1/audit/reports')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(reportRequest);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('reportId');
        expect(response.body.totalEvents).toBe(150);
        expect(response.body.statistics).toBeDefined();
      });
    });
  });

  describe('Public Verification Endpoint', () => {
    it('should allow public verification without auth', async () => {
      jest.spyOn(CertificationService, 'publicVerification').mockResolvedValue({
        valid: true,
        businessName: 'Test Indigenous Business',
        type: CertificationType.INDIGENOUS_BUSINESS,
        expiresOn: new Date('2025-01-01'),
        verificationUrl: 'https://indigenous.ca/verify/IND-2024-123456',
      });

      const response = await request(app)
        .get('/api/v1/public/verify/IND-2024-123456');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body).toHaveProperty('verificationUrl');
      // Should not include sensitive data
      expect(response.body).not.toHaveProperty('metadata');
    });

    it('should handle invalid certification numbers', async () => {
      jest.spyOn(CertificationService, 'publicVerification').mockResolvedValue({
        valid: false,
        message: 'Certification not found',
      });

      const response = await request(app)
        .get('/api/v1/public/verify/INVALID-NUMBER');

      expect(response.status).toBe(404);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('Indigenous Business Verification', () => {
    it('should verify band number with ISC', async () => {
      const verificationData = {
        businessId,
        bandNumber: '123',
        businessName: 'Test First Nation Business',
      };

      // Mock ISC verification
      jest.spyOn(CertificationService as any, 'verifyIndigenousStatus')
        .mockResolvedValue({
          valid: true,
          bandName: 'Test First Nation',
          region: 'Ontario',
          treaty: 'Treaty 3',
        });

      const response = await request(app)
        .post('/api/v1/verification/indigenous')
        .set('Authorization', `Bearer ${authToken}`)
        .send(verificationData);

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.bandName).toBe('Test First Nation');
    });

    it('should verify CCAB certification', async () => {
      const ccabData = {
        ccabNumber: 'CCAB-123456',
        businessId,
      };

      jest.spyOn(CertificationService as any, 'verifyCCAB')
        .mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/verification/ccab')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ccabData);

      expect(response.status).toBe(200);
      expect(response.body.ccabVerified).toBe(true);
    });
  });

  describe('Compliance Monitoring', () => {
    it('should detect expiring certifications', async () => {
      jest.spyOn(CertificationService, 'checkExpiringCertifications')
        .mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/compliance/check-expiring')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(CertificationService.checkExpiringCertifications).toHaveBeenCalled();
    });

    it('should perform compliance audit', async () => {
      const auditRequest = {
        businessId,
        checkTypes: ['certification', 'documents', 'regulatory'],
      };

      const response = await request(app)
        .post('/api/v1/compliance/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(auditRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('auditId');
      expect(response.body).toHaveProperty('results');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(CertificationService, 'createCertification')
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/certifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessId,
          businessName: 'Test',
          businessNumber: 'BN123',
          type: CertificationType.GENERAL,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Database');
    });

    it('should handle external API failures', async () => {
      jest.spyOn(CertificationService as any, 'verifyBusinessRegistry')
        .mockRejectedValue(new Error('Government API unavailable'));

      // Should not fail the entire certification process
      const response = await request(app)
        .post('/api/v1/certifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessId,
          businessName: 'Test',
          businessNumber: 'BN456',
          type: CertificationType.GENERAL,
          supportingDocuments: ['doc.pdf'],
        });

      // Should still create certification but log the external verification failure
      expect([200, 201]).toContain(response.status);
    });
  });
});