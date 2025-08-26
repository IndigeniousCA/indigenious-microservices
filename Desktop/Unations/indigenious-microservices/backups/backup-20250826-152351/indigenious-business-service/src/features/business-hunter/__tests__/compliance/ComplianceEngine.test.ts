/**
 * Tests for Compliance Engine
 */

import { ComplianceEngine } from '../../compliance/ComplianceEngine';
import { Redis } from 'ioredis';
import { BusinessType } from '../../types';

// Mock dependencies
jest.mock('ioredis');
jest.mock('axios');

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');

    engine = new ComplianceEngine(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CASL Compliance', () => {
    it('should validate compliant commercial electronic messages', async () => {
      const message = {
        to: 'business@example.com',
        from: 'sender@company.com',
        subject: 'Business Opportunity',
        content: 'Partnership proposal with clear identification and unsubscribe',
        purpose: 'business_relationship',
        consent: {
          type: 'express' as const,
          timestamp: new Date(),
          evidence: 'Signed up on website'
        },
        identification: {
          sender: 'ABC Company Inc.',
          mailingAddress: '123 Main St, Toronto, ON',
          contact: 'contact@company.com'
        },
        unsubscribe: {
          link: 'https://company.com/unsubscribe',
          instructions: 'Click here to unsubscribe'
        }
      };

      const result = await engine.checkCASLCompliance(message);

      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject messages without proper consent', async () => {
      const message = {
        to: 'business@example.com',
        from: 'sender@company.com',
        subject: 'Cold Outreach',
        content: 'Buy our products!',
        purpose: 'commercial'
      };

      const result = await engine.checkCASLCompliance(message);

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('No valid consent record');
    });

    it('should reject messages without unsubscribe mechanism', async () => {
      const message = {
        to: 'business@example.com',
        from: 'sender@company.com',
        subject: 'Newsletter',
        content: 'Monthly update',
        consent: {
          type: 'express' as const,
          timestamp: new Date()
        },
        identification: {
          sender: 'Company',
          mailingAddress: 'Address',
          contact: 'email@company.com'
        }
        // Missing unsubscribe
      };

      const result = await engine.checkCASLCompliance(message);

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('No unsubscribe mechanism');
    });

    it('should handle implied consent correctly', async () => {
      const message = {
        to: 'customer@example.com',
        from: 'business@company.com',
        subject: 'Your Recent Purchase',
        content: 'Thank you for your purchase',
        purpose: 'transactional',
        consent: {
          type: 'implied' as const,
          timestamp: new Date(),
          basis: 'recent_transaction',
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
        },
        identification: {
          sender: 'Company',
          mailingAddress: 'Address',
          contact: 'contact@company.com'
        },
        unsubscribe: {
          link: 'https://unsubscribe.com'
        }
      };

      const result = await engine.checkCASLCompliance(message);

      expect(result.compliant).toBe(true);
    });
  });

  describe('PIPEDA Compliance', () => {
    it('should validate proper data collection', async () => {
      const dataCollection = {
        purpose: 'business_verification',
        dataCategorized: {
          businessInfo: ['name', 'address', 'phone'],
          personalInfo: ['contact_name', 'contact_email']
        },
        consent: {
          obtained: true,
          method: 'opt-in_form',
          timestamp: new Date()
        },
        retention: {
          period: 365, // days
          deletion: 'automatic'
        },
        security: {
          encrypted: true,
          accessControl: true
        }
      };

      const result = await engine.checkPIPEDACompliance(dataCollection);

      expect(result.compliant).toBe(true);
      expect(result.requirements.met).toContain('Purpose clearly identified');
      expect(result.requirements.met).toContain('Consent obtained');
    });

    it('should reject excessive data collection', async () => {
      const dataCollection = {
        purpose: 'newsletter',
        dataCategorized: {
          businessInfo: ['name', 'email'],
          personalInfo: ['sin', 'credit_score', 'health_info'] // Excessive
        },
        consent: {
          obtained: true,
          method: 'implied'
        }
      };

      const result = await engine.checkPIPEDACompliance(dataCollection);

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('Excessive data collection for stated purpose');
    });

    it('should enforce data minimization', async () => {
      const assessment = await engine.assessDataMinimization({
        purpose: 'contact_for_partnership',
        requestedData: ['name', 'email', 'phone', 'sin', 'banking_info'],
        requiredData: ['name', 'email']
      });

      expect(assessment.compliant).toBe(false);
      expect(assessment.unnecessaryFields).toContain('sin');
      expect(assessment.unnecessaryFields).toContain('banking_info');
    });
  });

  describe('Indigenous Data Sovereignty', () => {
    it('should enforce OCAP principles', async () => {
      const dataUsage = {
        business: {
          id: 'indigenous-1',
          type: BusinessType.INDIGENOUS_OWNED,
          nation: 'First Nation X'
        },
        ownership: {
          dataOwner: 'First Nation X',
          acknowledgment: true
        },
        control: {
          accessManagement: 'nation_controlled',
          usageApproval: true
        },
        access: {
          transparentProcess: true,
          dataPortability: true
        },
        possession: {
          physicalControl: 'canada_only',
          jurisdiction: 'first_nation'
        }
      };

      const result = await engine.checkOCAPCompliance(dataUsage);

      expect(result.compliant).toBe(true);
      expect(result.principles.ownership).toBe(true);
      expect(result.principles.control).toBe(true);
      expect(result.principles.access).toBe(true);
      expect(result.principles.possession).toBe(true);
    });

    it('should reject non-compliant Indigenous data handling', async () => {
      const dataUsage = {
        business: {
          id: 'indigenous-2',
          type: BusinessType.INDIGENOUS_OWNED,
          nation: 'First Nation Y'
        },
        ownership: {
          dataOwner: 'third_party', // Wrong
          acknowledgment: false
        },
        control: {
          accessManagement: 'platform_controlled', // Wrong
          usageApproval: false
        }
      };

      const result = await engine.checkOCAPCompliance(dataUsage);

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('Data not owned by Indigenous community');
      expect(result.issues).toContain('Community does not control access');
    });
  });

  describe('Web Scraping Compliance', () => {
    it('should respect robots.txt', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValueOnce({
        data: `
User-agent: *
Disallow: /private/
Disallow: /api/
Allow: /public/
Crawl-delay: 2
        `
      });

      const result = await engine.checkWebScrapingCompliance({
        url: 'https://example.com/public/businesses',
        userAgent: 'BusinessHunter/1.0'
      });

      expect(result.allowed).toBe(true);
      expect(result.crawlDelay).toBe(2);
    });

    it('should block disallowed paths', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValueOnce({
        data: `
User-agent: *
Disallow: /api/
        `
      });

      const result = await engine.checkWebScrapingCompliance({
        url: 'https://example.com/api/data',
        userAgent: 'BusinessHunter/1.0'
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Disallowed by robots.txt');
    });

    it('should check terms of service', async () => {
      const tosCompliance = await engine.checkTermsOfService({
        domain: 'example.com',
        intendedUse: 'data_collection',
        automated: true
      });

      expect(tosCompliance).toHaveProperty('allowed');
      expect(tosCompliance).toHaveProperty('restrictions');
    });
  });

  describe('Provincial Compliance', () => {
    it('should check Quebec privacy law (Law 25)', async () => {
      const result = await engine.checkProvincialCompliance('QC', {
        dataCollection: {
          purpose: 'business_development',
          transparency: true,
          frenchLanguage: true
        },
        consent: {
          explicit: true,
          granular: true,
          withdrawable: true
        }
      });

      expect(result.compliant).toBe(true);
      expect(result.law).toBe('Law 25');
    });

    it('should check BC privacy requirements', async () => {
      const result = await engine.checkProvincialCompliance('BC', {
        dataCollection: {
          purpose: 'marketing',
          publicBody: false
        },
        security: {
          reasonable: true,
          documented: true
        }
      });

      expect(result.compliant).toBe(true);
      expect(result.law).toBe('PIPA');
    });

    it('should check Alberta privacy requirements', async () => {
      const result = await engine.checkProvincialCompliance('AB', {
        dataCollection: {
          purpose: 'customer_service',
          notification: true
        },
        consent: {
          obtained: true,
          documented: true
        }
      });

      expect(result.compliant).toBe(true);
      expect(result.law).toBe('PIPA');
    });
  });

  describe('Campaign Compliance', () => {
    it('should validate campaign compliance', async () => {
      const campaign = {
        id: 'campaign-1',
        name: 'Indigenous Partnership Drive',
        targetAudience: {
          businessTypes: [BusinessType.INDIGENOUS_OWNED],
          hasConsent: true
        },
        channels: ['email', 'linkedin'],
        messages: {
          includeUnsubscribe: true,
          identifySender: true,
          respectOptOut: true
        }
      };

      const result = await engine.checkCampaignCompliance(campaign);

      expect(result.compliant).toBe(true);
      expect(result.checks.CASL).toBe(true);
      expect(result.checks.PIPEDA).toBe(true);
    });

    it('should enforce channel-specific rules', async () => {
      const smsCompliance = await engine.checkChannelCompliance('sms', {
        message: 'Text STOP to opt out',
        timing: { hour: 9, timezone: 'America/Toronto' },
        frequency: { count: 1, period: 'day' }
      });

      expect(smsCompliance.compliant).toBe(true);

      const lateNightSMS = await engine.checkChannelCompliance('sms', {
        message: 'Late night message',
        timing: { hour: 23, timezone: 'America/Toronto' }
      });

      expect(lateNightSMS.compliant).toBe(false);
      expect(lateNightSMS.issues).toContain('Outside allowed hours');
    });
  });

  describe('Consent Management', () => {
    it('should track consent properly', async () => {
      const consent = await engine.recordConsent({
        identifier: 'business@example.com',
        type: 'express',
        purpose: ['marketing', 'newsletters'],
        channel: 'email',
        source: 'website_form',
        ipAddress: '192.168.1.1',
        timestamp: new Date()
      });

      expect(consent.id).toBeDefined();
      expect(consent.active).toBe(true);

      const hasConsent = await engine.hasValidConsent(
        'business@example.com',
        'marketing',
        'email'
      );

      expect(hasConsent).toBe(true);
    });

    it('should handle consent withdrawal', async () => {
      const email = 'withdraw@example.com';
      
      // Record consent first
      await engine.recordConsent({
        identifier: email,
        type: 'express',
        purpose: ['marketing'],
        channel: 'email'
      });

      // Withdraw consent
      await engine.withdrawConsent(email, 'email', 'User request');

      const hasConsent = await engine.hasValidConsent(email, 'marketing', 'email');
      expect(hasConsent).toBe(false);
    });

    it('should expire implied consent', async () => {
      const consent = await engine.recordConsent({
        identifier: 'implied@example.com',
        type: 'implied',
        purpose: ['transactional'],
        channel: 'email',
        basis: 'recent_inquiry',
        expiresAt: new Date(Date.now() - 1000) // Already expired
      });

      const hasConsent = await engine.hasValidConsent(
        'implied@example.com',
        'transactional',
        'email'
      );

      expect(hasConsent).toBe(false);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report', async () => {
      const report = await engine.generateComplianceReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        regulations: ['CASL', 'PIPEDA', 'OCAP']
      });

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('recommendations');
      expect(report.period).toEqual({
        start: '2024-01-01',
        end: '2024-01-31'
      });
    });

    it('should track compliance metrics', async () => {
      const metrics = await engine.getComplianceMetrics();

      expect(metrics).toHaveProperty('caslCompliance');
      expect(metrics).toHaveProperty('pipedaCompliance');
      expect(metrics).toHaveProperty('consentRate');
      expect(metrics).toHaveProperty('optOutRate');
      expect(metrics).toHaveProperty('dataRequests');
    });
  });

  describe('Data Rights', () => {
    it('should handle access requests', async () => {
      const accessRequest = await engine.handleAccessRequest({
        requestor: 'user@example.com',
        verificationMethod: 'email',
        verified: true
      });

      expect(accessRequest.status).toBe('completed');
      expect(accessRequest.data).toBeDefined();
      expect(accessRequest.format).toBe('json');
    });

    it('should handle deletion requests', async () => {
      const deletionRequest = await engine.handleDeletionRequest({
        requestor: 'delete@example.com',
        verificationMethod: 'email',
        verified: true,
        reason: 'User request'
      });

      expect(deletionRequest.status).toBe('completed');
      expect(deletionRequest.deletedFrom).toContain('businesses');
      expect(deletionRequest.retentionRecord).toBeDefined();
    });

    it('should handle portability requests', async () => {
      const portabilityRequest = await engine.handlePortabilityRequest({
        requestor: 'port@example.com',
        format: 'csv',
        verified: true
      });

      expect(portabilityRequest.status).toBe('completed');
      expect(portabilityRequest.downloadUrl).toBeDefined();
      expect(portabilityRequest.expiresAt).toBeDefined();
    });
  });

  describe('Audit Trail', () => {
    it('should create comprehensive audit logs', async () => {
      await engine.checkCASLCompliance({
        to: 'audit@example.com',
        from: 'sender@company.com',
        subject: 'Test',
        content: 'Test message'
      });

      const auditLogs = await engine.getAuditLogs({
        action: 'compliance_check',
        regulation: 'CASL',
        limit: 10
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0]).toHaveProperty('timestamp');
      expect(auditLogs[0]).toHaveProperty('action');
      expect(auditLogs[0]).toHaveProperty('result');
      expect(auditLogs[0]).toHaveProperty('details');
    });
  });
});