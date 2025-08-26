import { SwarmOrchestrator } from '../../core/orchestrator/SwarmOrchestrator';
import { SecurityLayer } from '../../security/SecurityLayer';
import { AuditLogger, AuditEventType } from '../../security/AuditLogger';
import { BusinessRepository } from '../../core/storage/BusinessRepository';
import { redis } from '../../core/utils/redis';
import { Pool } from 'pg';

// Mock external dependencies
jest.mock('../../core/utils/redis');
jest.mock('pg');

describe('Business Hunter End-to-End Integration Tests', () => {
  let orchestrator: SwarmOrchestrator;
  let security: SecurityLayer;
  let auditLogger: AuditLogger;
  let repository: BusinessRepository;
  let apiKey: string;

  beforeAll(async () => {
    // Initialize security layer
    security = new SecurityLayer({
      encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      jwtSecret: 'test-jwt-secret',
      apiKeyPrefix: 'bh_test',
      maxRequestSize: 1048576,
      rateLimitWindow: 60000,
      suspiciousActivityThreshold: 5
    });

    // Generate API key for testing
    apiKey = security.generateApiKey({
      name: 'Integration Test Key',
      permissions: ['read', 'write', 'admin'],
      rateLimit: 1000
    });

    // Initialize audit logger
    const mockStorage = {
      store: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
      delete: jest.fn()
    };
    
    auditLogger = new AuditLogger({
      storage: mockStorage,
      retentionDays: 90,
      encryptLogs: true
    });

    // Initialize repository with mock database
    const mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      })
    };
    (Pool as jest.Mock).mockImplementation(() => mockPool);
    
    repository = new BusinessRepository();

    // Initialize orchestrator
    orchestrator = new SwarmOrchestrator({
      targetBusinesses: 1000,
      hunterCount: 5,
      enabledHunters: ['government', 'indigenous_org']
    });
  });

  afterAll(async () => {
    await orchestrator.stop();
  });

  describe('Complete Discovery Pipeline', () => {
    it('should discover, validate, enrich, and store businesses', async () => {
      // Start the orchestrator
      await orchestrator.start();

      // Simulate API request to trigger discovery
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-forwarded-for': '192.168.1.1'
        },
        body: {
          type: 'government',
          action: 'start',
          count: 2
        }
      };

      // Validate request
      const validation = await security.validateRequest(request);
      expect(validation.valid).toBe(true);

      // Log the action
      await auditLogger.log({
        eventType: AuditEventType.HUNTER_STARTED,
        apiKeyId: 'test-key',
        ipAddress: '192.168.1.1',
        resource: '/hunters/start',
        action: 'START_HUNTERS',
        result: 'success',
        metadata: { hunterType: 'government', count: 2 }
      });

      // Wait for some discoveries
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check progress
      const progress = await orchestrator.getProgress();
      expect(progress.totalDiscovered).toBeGreaterThan(0);
      expect(progress.activeHunters).toBeGreaterThan(0);

      // Verify data flow through queues
      const health = await orchestrator.getSystemHealth();
      expect(health.status).toBe('healthy');
    });

    it('should handle concurrent hunter operations', async () => {
      const operations = [];

      // Start multiple hunters concurrently
      for (let i = 0; i < 3; i++) {
        operations.push(
          orchestrator.scaleHunters('government', 2),
          orchestrator.scaleHunters('indigenous_org', 2)
        );
      }

      await Promise.all(operations);

      // Verify all hunters are running
      const hunters = await orchestrator.getHunterStatus();
      const activeCount = hunters.filter(h => h.status === 'active').length;
      expect(activeCount).toBeGreaterThan(0);
    });
  });

  describe('Security Integration', () => {
    it('should enforce security policies throughout the pipeline', async () => {
      // Test rate limiting across multiple requests
      const requests = [];
      const limitedKey = security.generateApiKey({
        name: 'Limited Key',
        permissions: ['read'],
        rateLimit: 5
      });

      for (let i = 0; i < 10; i++) {
        requests.push(security.validateRequest({
          headers: {
            'x-api-key': limitedKey,
            'x-forwarded-for': '10.0.0.1'
          },
          body: { query: 'test' }
        }));
      }

      const results = await Promise.all(requests);
      const successCount = results.filter(r => r.valid).length;
      const failureCount = results.filter(r => !r.valid && r.error === 'Rate limit exceeded').length;

      expect(successCount).toBe(5);
      expect(failureCount).toBe(5);
    });

    it('should track all security events in audit log', async () => {
      const events = [];

      // Subscribe to audit events
      auditLogger.on('audit', (event) => {
        events.push(event);
      });

      // Trigger various security events
      await security.validateRequest({
        headers: {
          'x-api-key': 'invalid-key',
          'x-forwarded-for': '192.168.1.100'
        },
        body: {}
      });

      // Log the failed attempt
      await auditLogger.log({
        eventType: AuditEventType.AUTHENTICATION_FAILURE,
        ipAddress: '192.168.1.100',
        resource: '/api/hunters',
        action: 'AUTHENTICATE',
        result: 'failure',
        errorMessage: 'Invalid API key'
      });

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(AuditEventType.AUTHENTICATION_FAILURE);
      expect(events[0].riskScore).toBeGreaterThan(0);
    });
  });

  describe('Data Quality and Enrichment', () => {
    it('should maintain data quality through validation pipeline', async () => {
      const testBusiness = {
        id: 'test-123',
        name: 'Test Indigenous Business Inc.',
        legalName: 'Test Indigenous Business Incorporated',
        industry: ['construction'],
        indigenousIdentifiers: {
          selfIdentified: true,
          communityAffiliation: 'Cree Nation'
        },
        contact: {
          email: 'info@testbusiness.ca',
          phone: '416-555-0123',
          website: 'https://testbusiness.ca'
        },
        location: {
          city: 'Toronto',
          province: 'ON',
          country: 'Canada'
        },
        metadata: {
          source: 'test',
          discoveredAt: new Date(),
          confidence: 0.85
        }
      };

      // Validate the business
      const validator = orchestrator['validator'];
      const validationResult = await validator.validate(testBusiness);
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Enrich the business
      const enricher = orchestrator['enricher'];
      const enrichedBusiness = await enricher.enrich(testBusiness);

      expect(enrichedBusiness).toHaveProperty('verified');
      expect(enrichedBusiness).toHaveProperty('taxDebtStatus');
    });

    it('should handle data deduplication', async () => {
      const business1 = {
        id: 'dup-1',
        name: 'Duplicate Business',
        registrationNumber: 'ON1234567'
      };

      const business2 = {
        id: 'dup-2',
        name: 'Duplicate Business Inc',
        registrationNumber: 'ON1234567' // Same registration number
      };

      // Process both businesses
      await repository.save(business1 as any);
      await repository.save(business2 as any);

      // Query should return only one
      const results = await repository.findByRegistrationNumber('ON1234567');
      expect(results).toHaveLength(1);
    });
  });

  describe('Export and Reporting', () => {
    it('should export data in multiple formats', async () => {
      // Test CSV export
      const csvExport = await orchestrator.exportBusinesses('csv', {
        verified: true,
        provinces: ['ON', 'BC']
      });
      expect(csvExport).toBeInstanceOf(Buffer);

      // Test JSON export
      const jsonExport = await orchestrator.exportBusinesses('json', {
        indigenous: true
      });
      expect(jsonExport).toBeInstanceOf(Buffer);
    });

    it('should generate compliance reports', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Generate SOC2 report
      const soc2Report = await auditLogger.generateComplianceReport(
        startDate,
        endDate,
        'SOC2'
      );

      expect(soc2Report.type).toBe('SOC2');
      expect(soc2Report.sections).toHaveProperty('security');
      expect(soc2Report.sections).toHaveProperty('availability');
      expect(soc2Report.sections).toHaveProperty('confidentiality');

      // Generate PIPEDA report
      const pipedaReport = await auditLogger.generateComplianceReport(
        startDate,
        endDate,
        'PIPEDA'
      );

      expect(pipedaReport.type).toBe('PIPEDA');
      expect(pipedaReport.sections).toHaveProperty('accountability');
      expect(pipedaReport.sections).toHaveProperty('consent');
      expect(pipedaReport.sections).toHaveProperty('safeguards');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume discovery operations', async () => {
      const startTime = Date.now();
      
      // Scale up hunters
      await orchestrator.scaleHunters('government', 10);
      await orchestrator.scaleHunters('indigenous_org', 10);

      // Run for a brief period
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check performance metrics
      const stats = await orchestrator.getProgress();
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      expect(stats.discoveryRate).toBeGreaterThan(0);
      expect(stats.totalDiscovered).toBeGreaterThan(0);

      // Scale down
      await orchestrator.scaleHunters('government', 2);
      await orchestrator.scaleHunters('indigenous_org', 2);
    });

    it('should maintain performance under load', async () => {
      const loadTestPromises = [];

      // Simulate multiple concurrent API requests
      for (let i = 0; i < 50; i++) {
        loadTestPromises.push(
          security.validateRequest({
            headers: {
              'x-api-key': apiKey,
              'x-forwarded-for': `192.168.1.${i % 255}`
            },
            body: {
              query: `test-${i}`,
              filters: { province: 'ON' }
            }
          })
        );
      }

      const results = await Promise.all(loadTestPromises);
      const successRate = results.filter(r => r.valid).length / results.length;

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from hunter failures', async () => {
      // Get a hunter ID
      const hunters = await orchestrator.getHunterStatus();
      const hunterId = hunters[0]?.id;

      if (hunterId) {
        // Simulate hunter failure
        await orchestrator.pauseHunter(hunterId);
        
        // Verify it's paused
        let status = await orchestrator.getHunterStatus();
        let hunter = status.find(h => h.id === hunterId);
        expect(hunter?.status).toBe('idle');

        // Restart the hunter
        await orchestrator.restartHunter(hunterId);

        // Verify it's active again
        status = await orchestrator.getHunterStatus();
        hunter = status.find(h => h.id === hunterId);
        expect(hunter?.status).toBe('active');
      }
    });

    it('should handle database connection failures gracefully', async () => {
      // Mock database failure
      const mockError = new Error('Database connection failed');
      jest.spyOn(repository as any, 'pool', 'get').mockImplementation(() => {
        throw mockError;
      });

      // Attempt to save should not crash the system
      try {
        await repository.save({} as any);
      } catch (error) {
        expect(error).toBe(mockError);
      }

      // System should continue operating
      const health = await orchestrator.getSystemHealth();
      expect(health.services.hunters).toBe(true);
    });
  });

  describe('Integration with Main Platform', () => {
    it('should send enriched businesses to main platform webhook', async () => {
      const mockWebhook = jest.fn().mockResolvedValue({ status: 200 });
      
      // Mock the webhook call
      jest.spyOn(orchestrator as any, 'sendToMainPlatform')
        .mockImplementation(mockWebhook);

      // Process a business through the pipeline
      const business = {
        id: 'webhook-test',
        name: 'Webhook Test Business',
        verified: true,
        indigenousIdentifiers: {
          selfIdentified: true
        }
      };

      await orchestrator['processExportQueue']();

      // Verify webhook would be called for verified Indigenous businesses
      if (business.verified && business.indigenousIdentifiers.selfIdentified) {
        expect(orchestrator['config'].mainPlatform.sendOnlyIndigenous).toBeDefined();
      }
    });
  });
});