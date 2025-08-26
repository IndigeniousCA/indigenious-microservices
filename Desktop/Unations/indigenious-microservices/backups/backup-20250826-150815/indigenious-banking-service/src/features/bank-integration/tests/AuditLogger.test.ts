/**
 * Audit Logger Tests
 * SOC 2 Type II Compliance Testing
 */

import { AuditLogger, auditLogger } from '../services/AuditLogger';
import { createHash } from 'crypto';

// Mock dependencies
jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('@/lib/prisma', () => ({
  auditEvent: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn()
  },
  $transaction: jest.fn(fn => Promise.resolve(fn()))
}));

jest.mock('@/lib/security/sealed-logs/indigenous-ledger', () => ({
  indigenousLedger: {
    log: jest.fn()
  }
}));

describe('AuditLogger', () => {
  const mockPrisma = require('@/lib/prisma');
  const mockLedger = require('@/lib/security/sealed-logs/indigenous-ledger').indigenousLedger;
  const mockLogger = require('@/lib/monitoring/logger').logger;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (AuditLogger as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuditLogger.getInstance();
      const instance2 = AuditLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logEvent', () => {
    it('should log a basic audit event', async () => {
      const eventParams = {
        eventType: 'login_success' as const,
        userId: 'user123',
        action: 'user_login',
        result: 'success' as const
      };

      mockPrisma.auditEvent.create.mockResolvedValue({ id: 'evt_123' });

      await auditLogger.logEvent(eventParams);

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'login_success',
          userId: 'user123',
          action: 'user_login',
          result: 'success',
          severity: 'low',
          dataIntegrity: expect.objectContaining({
            hash: expect.any(String)
          })
        })
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Audit event logged',
        expect.any(Object)
      );
    });

    it('should calculate correct severity levels', async () => {
      const criticalEvent = {
        eventType: 'account_locked' as const,
        userId: 'user123'
      };

      await auditLogger.logEvent(criticalEvent);

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'critical'
        })
      });
    });

    it('should maintain hash chain integrity', async () => {
      // Mock previous event
      mockPrisma.auditEvent.findFirst.mockResolvedValue({
        dataIntegrity: { hash: 'previous_hash_123' }
      });

      await auditLogger.logEvent({
        eventType: 'data_read' as const,
        userId: 'user123'
      });

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dataIntegrity: expect.objectContaining({
            previousHash: 'previous_hash_123'
          })
        })
      });
    });

    it('should sanitize sensitive metadata', async () => {
      const eventWithSensitive = {
        eventType: 'payment_initiated' as const,
        userId: 'user123',
        metadata: {
          password: 'secret123',
          apiKey: 'sk_test_123',
          normalData: 'visible'
        }
      };

      await auditLogger.logEvent(eventWithSensitive);

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            password: '[REDACTED]',
            apiKey: '[REDACTED]',
            normalData: 'visible'
          }
        })
      });
    });

    it('should log critical events to blockchain', async () => {
      const paymentEvent = {
        eventType: 'payment_completed' as const,
        userId: 'user123',
        metadata: { amount: 50000 }
      };

      await auditLogger.logEvent(paymentEvent);

      expect(mockLedger.log).toHaveBeenCalledWith(
        'audit_event',
        'high',
        expect.stringContaining('payment_completed'),
        expect.any(Object)
      );
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.auditEvent.create.mockRejectedValue(new Error('DB Error'));

      await expect(auditLogger.logEvent({
        eventType: 'login_attempt' as const,
        userId: 'user123'
      })).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit event',
        expect.any(Object)
      );
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events with proper metadata', async () => {
      await auditLogger.logSecurityEvent({
        eventType: 'suspicious_activity',
        userId: 'user123',
        severity: 'high',
        ipAddress: '192.168.1.1',
        metadata: { reason: 'Multiple failed attempts' }
      });

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'security_alert',
          severity: 'high',
          metadata: expect.objectContaining({
            securityEventType: 'suspicious_activity',
            reason: 'Multiple failed attempts'
          })
        })
      });
    });
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs with filters', async () => {
      const mockEvents = [
        { id: 'evt1', eventType: 'login_success' },
        { id: 'evt2', eventType: 'payment_completed' }
      ];

      mockPrisma.auditEvent.findMany.mockResolvedValue(mockEvents);
      mockPrisma.auditEvent.count.mockResolvedValue(2);

      const result = await auditLogger.queryAuditLogs({
        userId: 'user123',
        eventTypes: ['login_success'],
        limit: 10
      }, 'admin123');

      expect(mockPrisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          eventType: { in: ['login_success'] }
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        skip: 0
      });

      expect(result).toEqual({
        events: mockEvents,
        total: 2,
        hasMore: false
      });

      // Verify audit trail access is logged
      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'audit_trail_accessed',
          userId: 'admin123'
        })
      });
    });

    it('should handle date range queries', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await auditLogger.queryAuditLogs({
        startDate,
        endDate
      }, 'admin123');

      expect(mockPrisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0
      });
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify hash chain integrity', async () => {
      const events = [
        {
          id: 'evt1',
          dataIntegrity: {
            hash: 'hash1',
            previousHash: null
          }
        },
        {
          id: 'evt2',
          dataIntegrity: {
            hash: 'hash2',
            previousHash: 'hash1'
          }
        }
      ];

      mockPrisma.auditEvent.findMany.mockResolvedValue(events);

      // Mock hash calculation to match stored hashes
      jest.spyOn(auditLogger as any, 'generateHash')
        .mockReturnValueOnce('hash1')
        .mockReturnValueOnce('hash2');

      const result = await auditLogger.verifyIntegrity(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toEqual({
        valid: true,
        errors: [],
        eventsChecked: 2
      });
    });

    it('should detect hash chain breaks', async () => {
      const events = [
        {
          id: 'evt1',
          dataIntegrity: {
            hash: 'hash1',
            previousHash: null
          }
        },
        {
          id: 'evt2',
          dataIntegrity: {
            hash: 'hash2',
            previousHash: 'wrong_hash' // Chain broken
          }
        }
      ];

      mockPrisma.auditEvent.findMany.mockResolvedValue(events);

      const result = await auditLogger.verifyIntegrity(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Hash chain broken at event evt2');
    });
  });

  describe('applyRetentionPolicy', () => {
    it('should delete old non-critical events', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - (2556 * 24 * 60 * 60 * 1000)); // Older than 7 years

      mockPrisma.auditEvent.findMany.mockResolvedValue([]);
      mockPrisma.auditEvent.deleteMany
        .mockResolvedValueOnce({ count: 100 }) // Non-critical
        .mockResolvedValueOnce({ count: 5 });  // Critical

      const result = await auditLogger.applyRetentionPolicy();

      expect(result).toEqual({
        deleted: 105,
        archived: 0
      });

      expect(mockPrisma.auditEvent.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('should archive critical events before deletion', async () => {
      const criticalEvents = [
        {
          id: 'evt1',
          severity: 'critical',
          eventType: 'fraud_detected'
        }
      ];

      mockPrisma.auditEvent.findMany.mockResolvedValue(criticalEvents);
      mockPrisma.auditEvent.deleteMany.mockResolvedValue({ count: 0 });

      jest.spyOn(auditLogger as any, 'archiveEvent').mockResolvedValue(undefined);

      const result = await auditLogger.applyRetentionPolicy();

      expect(result.archived).toBe(1);
      expect((auditLogger as any).archiveEvent).toHaveBeenCalledWith(criticalEvents[0]);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', async () => {
      const stats = [
        { eventType: 'login_failure', severity: 'medium', _count: 50 },
        { eventType: 'payment_completed', severity: 'info', _count: 100 },
        { eventType: 'anomaly_detected', severity: 'high', _count: 15 }
      ];

      mockPrisma.auditEvent.groupBy.mockResolvedValue(stats);
      
      jest.spyOn(auditLogger, 'verifyIntegrity').mockResolvedValue({
        valid: true,
        errors: [],
        eventsChecked: 1000
      });

      const report = await auditLogger.generateComplianceReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        reportType: 'all'
      });

      expect(report).toMatchObject({
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        reportType: 'all',
        summary: {
          totalEvents: 165,
          failedAuthentications: 50,
          anomaliesDetected: 15
        },
        compliance: {
          dataIntegrityValid: true
        }
      });

      expect(report.recommendations).toContain(
        'Multiple anomalies detected. Investigate potential security threats.'
      );
    });
  });

  describe('SOC 2 Compliance', () => {
    it('should generate unique event IDs', async () => {
      const calls: string[] = [];
      
      // Capture multiple event IDs
      for (let i = 0; i < 5; i++) {
        await auditLogger.logEvent({
          eventType: 'data_read' as const,
          userId: 'user123'
        });
      }

      const createCalls = mockPrisma.auditEvent.create.mock.calls;
      const eventIds = createCalls.map(call => call[0].data.id);

      // All IDs should be unique
      const uniqueIds = new Set(eventIds);
      expect(uniqueIds.size).toBe(eventIds.length);

      // IDs should follow the format
      eventIds.forEach(id => {
        expect(id).toMatch(/^evt_\d+_[a-z0-9]{9}$/);
      });
    });

    it('should enforce retention periods', async () => {
      const logger = AuditLogger.getInstance();
      expect((logger as any).RETENTION_DAYS).toBe(2555); // 7 years
      expect((logger as any).CRITICAL_EVENTS_RETENTION_DAYS).toBe(3650); // 10 years
    });

    it('should maintain data integrity with hash chains', async () => {
      // First event
      await auditLogger.logEvent({
        eventType: 'system_startup' as const
      });

      const firstCall = mockPrisma.auditEvent.create.mock.calls[0];
      const firstHash = firstCall[0].data.dataIntegrity.hash;

      // Mock the first event for hash chain
      mockPrisma.auditEvent.findFirst.mockResolvedValue({
        dataIntegrity: { hash: firstHash }
      });

      // Second event should reference first
      await auditLogger.logEvent({
        eventType: 'system_shutdown' as const
      });

      const secondCall = mockPrisma.auditEvent.create.mock.calls[1];
      expect(secondCall[0].data.dataIntegrity.previousHash).toBe(firstHash);
    });
  });
});