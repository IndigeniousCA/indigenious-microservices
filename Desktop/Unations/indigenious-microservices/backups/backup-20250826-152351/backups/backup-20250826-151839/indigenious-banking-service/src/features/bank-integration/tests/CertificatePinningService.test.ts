/**
 * Certificate Pinning Service Tests
 * SOC 2 Type II Compliance Testing
 */

import { CertificatePinningService, certificatePinning } from '../services/CertificatePinningService';
import https from 'https';
import tls from 'tls';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../services/AuditLogger', () => ({
  auditLogger: {
    logEvent: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

jest.mock('../services/RedisEncryptionService', () => ({
  redisEncryption: {
    getEncrypted: jest.fn(),
    setEncrypted: jest.fn()
  }
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn()
}));

// Mock TLS module
jest.mock('tls', () => ({
  checkServerIdentity: jest.fn(),
  connect: jest.fn()
}));

describe('CertificatePinningService', () => {
  const mockLogger = require('@/lib/monitoring/logger').logger;
  const mockAuditLogger = require('../services/AuditLogger').auditLogger;
  const mockRedis = require('../services/RedisEncryptionService').redisEncryption;
  const mockFs = require('fs/promises');
  
  const mockCertificate: Partial<tls.PeerCertificate> = {
    subject: 'CN=api.scotiabank.com',
    issuer: 'CN=Scotia CA',
    fingerprint: 'AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12',
    fingerprint256: 'sha256Fingerprint',
    valid_from: '2024-01-01',
    valid_to: '2025-01-01',
    serialNumber: '1234567890',
    raw: Buffer.from('certificate-data')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (CertificatePinningService as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CertificatePinningService.getInstance();
      const instance2 = CertificatePinningService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should extend EventEmitter', () => {
      const instance = CertificatePinningService.getInstance();
      expect(instance).toBeInstanceOf(EventEmitter);
    });
  });

  describe('createPinnedHttpsAgent', () => {
    it('should create HTTPS agent with certificate validation', () => {
      const service = CertificatePinningService.getInstance();
      const agent = service.createPinnedHttpsAgent('api.scotiabank.com');
      
      expect(agent).toBeInstanceOf(https.Agent);
      expect(agent.options).toHaveProperty('checkServerIdentity');
    });

    it('should warn when no pins configured', () => {
      const service = CertificatePinningService.getInstance();
      service.createPinnedHttpsAgent('unknown-host.com');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No certificate pins configured for hostname',
        { hostname: 'unknown-host.com' }
      );
    });

    it('should validate certificate during connection', () => {
      const service = CertificatePinningService.getInstance();
      
      // Add test pin
      const pins = service.getPins('api.scotiabank.com') || {
        hostname: 'api.scotiabank.com',
        pins: [{
          algorithm: 'sha256' as const,
          fingerprint: 'testFingerprint',
          isBackup: false
        }],
        enforceMode: true
      };
      (service as any).pins.set('api.scotiabank.com', pins);
      
      const agent = service.createPinnedHttpsAgent('api.scotiabank.com');
      const checkServerIdentity = agent.options.checkServerIdentity!;
      
      // Mock standard validation to pass
      (tls.checkServerIdentity as jest.Mock).mockReturnValue(undefined);
      
      // Mock certificate validation to fail
      jest.spyOn(service, 'validateCertificatePin').mockReturnValue({
        valid: false,
        hostname: 'api.scotiabank.com',
        error: 'No matching pin',
        certificateChain: []
      });
      
      const error = checkServerIdentity('api.scotiabank.com', mockCertificate as any);
      
      expect(error).toBeDefined();
      expect(error?.message).toContain('Certificate pinning failed');
    });

    it('should allow connection in report-only mode', () => {
      const service = CertificatePinningService.getInstance();
      
      // Add test pin in report-only mode
      const pins = {
        hostname: 'api.scotiabank.com',
        pins: [{
          algorithm: 'sha256' as const,
          fingerprint: 'testFingerprint',
          isBackup: false
        }],
        enforceMode: false // Report-only mode
      };
      (service as any).pins.set('api.scotiabank.com', pins);
      
      const agent = service.createPinnedHttpsAgent('api.scotiabank.com');
      const checkServerIdentity = agent.options.checkServerIdentity!;
      
      (tls.checkServerIdentity as jest.Mock).mockReturnValue(undefined);
      
      jest.spyOn(service, 'validateCertificatePin').mockReturnValue({
        valid: false,
        hostname: 'api.scotiabank.com',
        error: 'No matching pin',
        certificateChain: []
      });
      
      const error = checkServerIdentity('api.scotiabank.com', mockCertificate as any);
      
      expect(error).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Certificate pinning failed (report-only mode)',
        expect.any(Object)
      );
    });
  });

  describe('validateCertificatePin', () => {
    it('should validate matching certificate pin', () => {
      const service = CertificatePinningService.getInstance();
      
      // Mock certificate chain extraction
      jest.spyOn(service as any, 'extractCertificateChain').mockReturnValue([
        mockCertificate
      ]);
      
      // Mock fingerprint calculation
      jest.spyOn(service as any, 'calculateFingerprint').mockReturnValue('validFingerprint');
      
      const pinConfig = {
        hostname: 'api.scotiabank.com',
        pins: [{
          algorithm: 'sha256' as const,
          fingerprint: 'validFingerprint',
          isBackup: false
        }],
        enforceMode: true
      };
      
      const result = service.validateCertificatePin(
        mockCertificate as any,
        pinConfig
      );
      
      expect(result.valid).toBe(true);
      expect(result.matchedPin).toBe('validFingerprint');
    });

    it('should reject expired pins', () => {
      const service = CertificatePinningService.getInstance();
      
      jest.spyOn(service as any, 'extractCertificateChain').mockReturnValue([
        mockCertificate
      ]);
      
      jest.spyOn(service as any, 'calculateFingerprint').mockReturnValue('expiredFingerprint');
      
      const pinConfig = {
        hostname: 'api.scotiabank.com',
        pins: [{
          algorithm: 'sha256' as const,
          fingerprint: 'expiredFingerprint',
          expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
          isBackup: false
        }],
        enforceMode: true
      };
      
      const result = service.validateCertificatePin(
        mockCertificate as any,
        pinConfig
      );
      
      expect(result.valid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Matched pin is expired',
        expect.any(Object)
      );
    });

    it('should use validation cache', () => {
      const service = CertificatePinningService.getInstance();
      const cache = (service as any).validationCache;
      
      const cachedResult = {
        valid: true,
        hostname: 'api.scotiabank.com',
        matchedPin: 'cachedPin',
        certificateChain: []
      };
      
      cache.set('api.scotiabank.com:fingerprint', {
        result: cachedResult,
        expires: Date.now() + 3600000
      });
      
      const pinConfig = {
        hostname: 'api.scotiabank.com',
        pins: [],
        enforceMode: true
      };
      
      const result = service.validateCertificatePin(
        { fingerprint: 'fingerprint' } as any,
        pinConfig
      );
      
      expect(result).toEqual(cachedResult);
    });
  });

  describe('updatePins', () => {
    it('should update certificate pins', async () => {
      const service = CertificatePinningService.getInstance();
      
      const newPins = [{
        algorithm: 'sha256' as const,
        fingerprint: 'newFingerprint',
        isBackup: false
      }];
      
      await service.updatePins('api.scotiabank.com', newPins);
      
      const stored = service.getPins('api.scotiabank.com');
      expect(stored?.pins).toEqual(newPins);
      
      expect(mockAuditLogger.logEvent).toHaveBeenCalledWith({
        eventType: 'config_changed',
        action: 'update_certificate_pins',
        severity: 'high',
        metadata: expect.any(Object)
      });
    });

    it('should clear cache when pins updated', async () => {
      const service = CertificatePinningService.getInstance();
      const cache = (service as any).validationCache;
      
      // Add cached entries
      cache.set('api.scotiabank.com:cert1', { result: {}, expires: Date.now() + 1000 });
      cache.set('api.scotiabank.com:cert2', { result: {}, expires: Date.now() + 1000 });
      cache.set('other.com:cert', { result: {}, expires: Date.now() + 1000 });
      
      await service.updatePins('api.scotiabank.com', []);
      
      expect(cache.has('api.scotiabank.com:cert1')).toBe(false);
      expect(cache.has('api.scotiabank.com:cert2')).toBe(false);
      expect(cache.has('other.com:cert')).toBe(true);
    });
  });

  describe('testPinning', () => {
    it('should test certificate pinning for hostname', async () => {
      const service = CertificatePinningService.getInstance();
      
      // Add test pin
      (service as any).pins.set('api.scotiabank.com', {
        hostname: 'api.scotiabank.com',
        pins: [{
          algorithm: 'sha256' as const,
          fingerprint: 'testFingerprint',
          isBackup: false
        }],
        enforceMode: true
      });
      
      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue(mockCertificate),
        end: jest.fn(),
        on: jest.fn(),
        setTimeout: jest.fn()
      };
      
      (tls.connect as jest.Mock).mockImplementation((options, callback) => {
        callback();
        return mockSocket;
      });
      
      jest.spyOn(service, 'validateCertificatePin').mockReturnValue({
        valid: true,
        hostname: 'api.scotiabank.com',
        matchedPin: 'testFingerprint',
        certificateChain: []
      });
      
      const result = await service.testPinning('api.scotiabank.com');
      
      expect(result.valid).toBe(true);
      expect(result.matchedPin).toBe('testFingerprint');
      expect(mockSocket.end).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const service = CertificatePinningService.getInstance();
      
      (service as any).pins.set('api.scotiabank.com', {
        hostname: 'api.scotiabank.com',
        pins: [],
        enforceMode: true
      });
      
      const mockSocket = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Connection failed'));
          }
        }),
        setTimeout: jest.fn()
      };
      
      (tls.connect as jest.Mock).mockReturnValue(mockSocket);
      
      const result = await service.testPinning('api.scotiabank.com');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should handle connection timeout', async () => {
      const service = CertificatePinningService.getInstance();
      
      (service as any).pins.set('api.scotiabank.com', {
        hostname: 'api.scotiabank.com',
        pins: [],
        enforceMode: true
      });
      
      const mockSocket = {
        on: jest.fn(),
        setTimeout: jest.fn((timeout, handler) => {
          handler();
        }),
        destroy: jest.fn()
      };
      
      (tls.connect as jest.Mock).mockReturnValue(mockSocket);
      
      const result = await service.testPinning('api.scotiabank.com');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Connection timeout');
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('getCertificateInfo', () => {
    it('should retrieve certificate information', async () => {
      const service = CertificatePinningService.getInstance();
      
      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue(mockCertificate),
        end: jest.fn(),
        on: jest.fn(),
        setTimeout: jest.fn()
      };
      
      (tls.connect as jest.Mock).mockImplementation((options, callback) => {
        callback();
        return mockSocket;
      });
      
      jest.spyOn(service as any, 'extractCertificateChain').mockReturnValue([
        mockCertificate
      ]);
      
      jest.spyOn(service as any, 'calculateFingerprint')
        .mockReturnValueOnce('sha256Fingerprint')
        .mockReturnValueOnce('sha384Fingerprint')
        .mockReturnValueOnce('sha512Fingerprint');
      
      const info = await service.getCertificateInfo('api.scotiabank.com');
      
      expect(info).toEqual({
        hostname: 'api.scotiabank.com',
        certificates: [{
          subject: mockCertificate.subject,
          issuer: mockCertificate.issuer,
          validFrom: mockCertificate.valid_from,
          validTo: mockCertificate.valid_to,
          fingerprints: {
            sha256: 'sha256Fingerprint',
            sha384: 'sha384Fingerprint',
            sha512: 'sha512Fingerprint'
          },
          serialNumber: mockCertificate.serialNumber,
          signatureAlgorithm: undefined
        }]
      });
    });
  });

  describe('checkCertificateExpiry', () => {
    it('should detect expiring certificates', async () => {
      const service = CertificatePinningService.getInstance();
      
      (service as any).pins.set('api.scotiabank.com', {
        hostname: 'api.scotiabank.com',
        pins: [],
        enforceMode: true
      });
      
      const expiringCert = {
        subject: 'CN=api.scotiabank.com',
        validTo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days
      };
      
      jest.spyOn(service, 'getCertificateInfo').mockResolvedValue({
        hostname: 'api.scotiabank.com',
        certificates: [expiringCert]
      });
      
      const warnings = await service.checkCertificateExpiry();
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({
        hostname: 'api.scotiabank.com',
        subject: expiringCert.subject,
        daysRemaining: expect.any(Number)
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Certificate expiring soon',
        expect.any(Object)
      );
    });

    it('should emit expiry warning event', async () => {
      const service = CertificatePinningService.getInstance();
      const emitSpy = jest.spyOn(service, 'emit');
      
      (service as any).pins.set('api.scotiabank.com', {
        hostname: 'api.scotiabank.com',
        pins: [],
        enforceMode: true
      });
      
      jest.spyOn(service, 'getCertificateInfo').mockResolvedValue({
        hostname: 'api.scotiabank.com',
        certificates: [{
          subject: 'CN=api.scotiabank.com',
          validTo: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
        }]
      });
      
      await service.checkCertificateExpiry();
      
      expect(emitSpy).toHaveBeenCalledWith(
        'certificate-expiry-warning',
        expect.any(Object)
      );
    });
  });

  describe('getStatistics', () => {
    it('should return pinning statistics', async () => {
      const service = CertificatePinningService.getInstance();
      
      // Add test pins
      (service as any).pins.set('api.scotiabank.com', {
        hostname: 'api.scotiabank.com',
        pins: [
          { algorithm: 'sha256', fingerprint: 'pin1', isBackup: false },
          { algorithm: 'sha256', fingerprint: 'pin2', isBackup: true }
        ],
        enforceMode: true,
        includeSubdomains: true
      });
      
      (service as any).pins.set('api.rbc.com', {
        hostname: 'api.rbc.com',
        pins: [
          { algorithm: 'sha256', fingerprint: 'pin3', isBackup: false }
        ],
        enforceMode: false,
        includeSubdomains: false
      });
      
      const stats = await service.getStatistics();
      
      expect(stats).toEqual({
        totalHostnames: 2,
        totalPins: 3,
        enforceMode: 1,
        reportOnlyMode: 1,
        validationsCached: 0,
        hostnameBreakdown: [
          {
            hostname: 'api.scotiabank.com',
            pinCount: 2,
            enforceMode: true,
            includeSubdomains: true
          },
          {
            hostname: 'api.rbc.com',
            pinCount: 1,
            enforceMode: false,
            includeSubdomains: false
          }
        ]
      });
    });
  });

  describe('Pin Loading and Saving', () => {
    it('should load pins from file', async () => {
      const savedPins = {
        'api.scotiabank.com': {
          hostname: 'api.scotiabank.com',
          pins: [{ algorithm: 'sha256', fingerprint: 'savedPin', isBackup: false }],
          enforceMode: true
        }
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedPins));
      
      // Create new instance to trigger loadPins
      (CertificatePinningService as any).instance = undefined;
      const service = CertificatePinningService.getInstance();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const loaded = service.getPins('api.scotiabank.com');
      expect(loaded?.pins[0].fingerprint).toBe('savedPin');
    });

    it('should save pins to file', async () => {
      const service = CertificatePinningService.getInstance();
      
      await service.updatePins('api.scotiabank.com', [{
        algorithm: 'sha256' as const,
        fingerprint: 'newPin',
        isBackup: false
      }]);
      
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('newPin'),
        'utf-8'
      );
    });
  });

  describe('Security Event Logging', () => {
    it('should log pinning failures', async () => {
      const service = CertificatePinningService.getInstance();
      
      const result = {
        valid: false,
        hostname: 'api.scotiabank.com',
        error: 'No matching pin',
        certificateChain: []
      };
      
      await (service as any).logPinningFailure('api.scotiabank.com', result);
      
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'certificate_pinning_failed',
        severity: 'critical',
        metadata: expect.any(Object)
      });
    });

    it('should throttle success logging', async () => {
      const service = CertificatePinningService.getInstance();
      
      const result = {
        valid: true,
        hostname: 'api.scotiabank.com',
        matchedPin: 'pin1',
        certificateChain: []
      };
      
      // First log should succeed
      await (service as any).logPinningSuccess('api.scotiabank.com', result);
      expect(mockAuditLogger.logEvent).toHaveBeenCalledTimes(1);
      
      // Second log within hour should be skipped
      mockRedis.getEncrypted.mockResolvedValue(Date.now() - 1000);
      await (service as any).logPinningSuccess('api.scotiabank.com', result);
      expect(mockAuditLogger.logEvent).toHaveBeenCalledTimes(1);
    });
  });
});