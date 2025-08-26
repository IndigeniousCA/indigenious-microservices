/**
 * MFA Service Tests
 * SOC 2 Type II Compliance Testing
 */

import { MFAService, mfaService } from '../services/MFAService';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

// Mock dependencies
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(() => 'TESTSECRET123456'),
    keyuri: jest.fn(() => 'otpauth://totp/test'),
    verify: jest.fn(),
    options: {}
  }
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockqrcode'))
}));

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({ sid: 'MSG123' }))
    }
  }));
});

jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../services/SecureCredentialManager', () => ({
  secureCredentialManager: {
    storeUserSecret: jest.fn(),
    getUserSecret: jest.fn()
  }
}));

jest.mock('../services/AuditLogger', () => ({
  auditLogger: {
    logEvent: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

jest.mock('@/lib/prisma', () => ({
  mfaChallenge: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  loginHistory: {
    findMany: jest.fn()
  }
}));

describe('MFAService', () => {
  const mockPrisma = require('@/lib/prisma');
  const mockCredentialManager = require('../services/SecureCredentialManager').secureCredentialManager;
  const mockAuditLogger = require('../services/AuditLogger').auditLogger;
  const mockAuthenticator = authenticator as jest.Mocked<typeof authenticator>;
  
  const mockMFAContext = {
    userId: 'user123',
    action: 'payment' as const,
    amount: 15000,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (MFAService as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MFAService.getInstance();
      const instance2 = MFAService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isMFARequired', () => {
    it('should always require MFA for critical actions', async () => {
      const result = await mfaService.isMFARequired({
        ...mockMFAContext,
        action: 'credential_change'
      });

      expect(result).toEqual({
        required: true,
        reason: 'Critical action requires MFA',
        recommendedMethod: 'totp'
      });
    });

    it('should require MFA for high-value payments', async () => {
      const result = await mfaService.isMFARequired({
        ...mockMFAContext,
        amount: 15000 // Above $10,000 threshold
      });

      expect(result).toEqual({
        required: true,
        reason: 'Payment exceeds 10000 threshold',
        recommendedMethod: 'totp'
      });
    });

    it('should recommend hardware token for very high amounts', async () => {
      const result = await mfaService.isMFARequired({
        ...mockMFAContext,
        amount: 75000
      });

      expect(result).toEqual({
        required: true,
        reason: 'Payment exceeds 10000 threshold',
        recommendedMethod: 'hardware'
      });
    });

    it('should detect high risk scores', async () => {
      // Mock high risk scenario
      jest.spyOn(mfaService as any, 'calculateUserRiskScore')
        .mockResolvedValue(85);

      const result = await mfaService.isMFARequired(mockMFAContext);

      expect(result).toEqual({
        required: true,
        reason: 'Elevated risk score',
        recommendedMethod: 'totp'
      });
    });

    it('should detect anomalous behavior', async () => {
      jest.spyOn(mfaService as any, 'detectAnomalousBehavior')
        .mockResolvedValue(true);

      const result = await mfaService.isMFARequired(mockMFAContext);

      expect(result).toEqual({
        required: true,
        reason: 'Anomalous activity detected',
        recommendedMethod: 'sms'
      });
    });

    it('should not require MFA for low-risk actions', async () => {
      jest.spyOn(mfaService as any, 'calculateUserRiskScore')
        .mockResolvedValue(20);
      jest.spyOn(mfaService as any, 'detectAnomalousBehavior')
        .mockResolvedValue(false);

      const result = await mfaService.isMFARequired({
        ...mockMFAContext,
        action: 'payment',
        amount: 500
      });

      expect(result).toEqual({
        required: false
      });
    });
  });

  describe('createChallenge', () => {
    it('should create TOTP challenge with QR code', async () => {
      mockPrisma.mfaChallenge.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com'
      });

      const result = await mfaService.createChallenge({
        userId: 'user123',
        method: 'totp',
        action: 'payment',
        context: {
          amount: 5000,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      });

      expect(result).toMatchObject({
        challengeId: expect.stringMatching(/^[a-f0-9]{64}$/),
        method: 'totp',
        qrCode: 'data:image/png;base64,mockqrcode',
        secret: 'TESTSECRET123456'
      });

      expect(mockCredentialManager.storeUserSecret).toHaveBeenCalledWith(
        'user123',
        'totp_secret',
        'TESTSECRET123456'
      );

      expect(qrcode.toDataURL).toHaveBeenCalled();
    });

    it('should create SMS challenge', async () => {
      mockPrisma.mfaChallenge.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        phone: '+1234567890'
      });

      const result = await mfaService.createChallenge({
        userId: 'user123',
        method: 'sms',
        action: 'payment',
        context: {
          amount: 5000,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      });

      expect(result).toMatchObject({
        challengeId: expect.any(String),
        method: 'sms',
        maskedDestination: '+12****7890'
      });

      // Verify SMS was sent
      const twilioClient = require('twilio')();
      expect(twilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('verification code'),
        to: '+1234567890',
        from: process.env.TWILIO_PHONE_NUMBER
      });
    });

    it('should enforce rate limiting', async () => {
      // Mock rate limit exceeded
      jest.spyOn(mfaService as any, 'checkRateLimit')
        .mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(mfaService.createChallenge({
        userId: 'user123',
        method: 'totp',
        action: 'payment',
        context: mockMFAContext
      })).rejects.toThrow('Rate limit exceeded');
    });

    it('should validate input parameters', async () => {
      await expect(mfaService.createChallenge({
        userId: 'invalid-uuid-format',
        method: 'invalid-method' as any,
        action: 'payment',
        context: mockMFAContext
      })).rejects.toThrow();
    });
  });

  describe('verifyChallenge', () => {
    const mockChallenge = {
      challengeId: 'challenge123',
      userId: 'user123',
      method: 'totp',
      action: 'payment',
      context: { ipAddress: '192.168.1.1' },
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 300000), // 5 minutes future
      verified: false
    };

    it('should verify valid TOTP code', async () => {
      mockPrisma.mfaChallenge.findUnique.mockResolvedValue(mockChallenge);
      mockPrisma.mfaChallenge.update.mockResolvedValue({});
      mockCredentialManager.getUserSecret.mockResolvedValue('TESTSECRET');
      mockAuthenticator.verify.mockReturnValue(true);

      const result = await mfaService.verifyChallenge({
        challengeId: 'challenge123',
        code: '123456',
        userId: 'user123'
      });

      expect(result).toEqual({
        verified: true
      });

      expect(mockPrisma.mfaChallenge.update).toHaveBeenCalledWith({
        where: { challengeId: 'challenge123' },
        data: { verified: true }
      });

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'mfa_verify_success',
        userId: 'user123',
        action: 'payment',
        ipAddress: '192.168.1.1',
        metadata: expect.any(Object)
      });
    });

    it('should handle invalid TOTP code', async () => {
      mockPrisma.mfaChallenge.findUnique.mockResolvedValue(mockChallenge);
      mockPrisma.mfaChallenge.update.mockResolvedValue({});
      mockCredentialManager.getUserSecret.mockResolvedValue('TESTSECRET');
      mockAuthenticator.verify.mockReturnValue(false);

      const result = await mfaService.verifyChallenge({
        challengeId: 'challenge123',
        code: 'wrong',
        userId: 'user123'
      });

      expect(result).toEqual({
        verified: false,
        attemptsRemaining: 2
      });

      expect(mockPrisma.mfaChallenge.update).toHaveBeenCalledWith({
        where: { challengeId: 'challenge123' },
        data: { attempts: 1 }
      });
    });

    it('should lock account after max attempts', async () => {
      const challengeMaxAttempts = {
        ...mockChallenge,
        attempts: 2 // One more attempt will exceed
      };

      mockPrisma.mfaChallenge.findUnique.mockResolvedValue(challengeMaxAttempts);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await mfaService.verifyChallenge({
        challengeId: 'challenge123',
        code: 'wrong',
        userId: 'user123'
      });

      expect(result).toEqual({
        verified: false,
        lockedOut: true,
        error: 'Too many attempts. Account locked.'
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          accountLocked: true,
          lockedAt: expect.any(Date),
          lockReason: 'Too many MFA attempts'
        }
      });
    });

    it('should reject expired challenges', async () => {
      const expiredChallenge = {
        ...mockChallenge,
        expiresAt: new Date(Date.now() - 1000) // Expired
      };

      mockPrisma.mfaChallenge.findUnique.mockResolvedValue(expiredChallenge);

      const result = await mfaService.verifyChallenge({
        challengeId: 'challenge123',
        code: '123456',
        userId: 'user123'
      });

      expect(result).toEqual({
        verified: false,
        error: 'Challenge expired'
      });
    });

    it('should detect challenge user mismatch', async () => {
      mockPrisma.mfaChallenge.findUnique.mockResolvedValue(mockChallenge);

      const result = await mfaService.verifyChallenge({
        challengeId: 'challenge123',
        code: '123456',
        userId: 'different-user'
      });

      expect(result).toEqual({
        verified: false,
        error: 'Invalid challenge'
      });

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'mfa_verify_failed',
        userId: 'different-user',
        severity: 'critical',
        metadata: expect.objectContaining({
          reason: 'Challenge user mismatch'
        })
      });
    });
  });

  describe('Risk Calculation', () => {
    beforeEach(() => {
      mockPrisma.loginHistory.findMany.mockResolvedValue([
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(Date.now() - 3600000),
          successful: true
        }
      ]);
    });

    it('should calculate risk score based on new IP', async () => {
      const score = await (mfaService as any).calculateUserRiskScore({
        userId: 'user123',
        ipAddress: '10.0.0.1', // Different IP
        userAgent: 'Mozilla/5.0'
      });

      expect(score).toBeGreaterThanOrEqual(30); // New IP adds 30 points
    });

    it('should calculate risk score based on new device', async () => {
      const score = await (mfaService as any).calculateUserRiskScore({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/96.0' // Different user agent
      });

      expect(score).toBeGreaterThanOrEqual(20); // New device adds 20 points
    });

    it('should calculate risk score based on unusual hours', async () => {
      // Mock current time as 3 AM
      const originalDate = Date;
      global.Date = jest.fn(() => ({
        ...new originalDate(),
        getHours: () => 3
      })) as any;

      const score = await (mfaService as any).calculateUserRiskScore({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(score).toBeGreaterThanOrEqual(15); // Unusual hours add 15 points

      global.Date = originalDate;
    });

    it('should detect failed attempts pattern', async () => {
      mockPrisma.loginHistory.findMany.mockResolvedValue([
        { successful: false },
        { successful: false },
        { successful: false }
      ]);

      const score = await (mfaService as any).calculateUserRiskScore({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(score).toBeGreaterThanOrEqual(30); // 3 failed attempts * 10
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per user and action', async () => {
      const limiter = (mfaService as any).rateLimiters;
      
      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        await expect((mfaService as any).checkRateLimit('user123', 'challenge_creation'))
          .resolves.not.toThrow();
      }

      // 6th request should fail
      await expect((mfaService as any).checkRateLimit('user123', 'challenge_creation'))
        .rejects.toThrow('Rate limit exceeded');

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'rate_limit_exceeded',
        userId: 'user123',
        severity: 'high',
        metadata: { action: 'challenge_creation' }
      });
    });
  });

  describe('Account Locking', () => {
    it('should lock account and notify security team', async () => {
      jest.spyOn(mfaService as any, 'notifySecurityTeam').mockResolvedValue(undefined);

      await (mfaService as any).lockAccount('user123', 'Suspicious activity');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          accountLocked: true,
          lockedAt: expect.any(Date),
          lockReason: 'Suspicious activity'
        }
      });

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'account_locked',
        userId: 'user123',
        severity: 'critical',
        metadata: { reason: 'Suspicious activity' }
      });

      expect((mfaService as any).notifySecurityTeam).toHaveBeenCalled();
    });
  });

  describe('SOC 2 Compliance', () => {
    it('should log all MFA checks', async () => {
      await mfaService.isMFARequired(mockMFAContext);

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'mfa_check',
        userId: 'user123',
        action: 'payment',
        ipAddress: '192.168.1.1',
        metadata: { amount: 15000 }
      });
    });

    it('should use secure code generation', async () => {
      // Mock crypto.randomInt
      const crypto = require('crypto');
      const randomIntSpy = jest.spyOn(crypto, 'randomInt');
      
      await (mfaService as any).sendSMSCode('user123', 'challenge123');

      expect(randomIntSpy).toHaveBeenCalledWith(100000, 999999);
    });

    it('should hash verification codes', async () => {
      const crypto = require('crypto');
      const hashSpy = jest.spyOn(crypto, 'createHash');

      await (mfaService as any).storeVerificationCode('challenge123', '123456');

      expect(hashSpy).toHaveBeenCalledWith('sha256');
    });

    it('should enforce TOTP window', () => {
      const service = MFAService.getInstance();
      expect((service as any).TOTP_WINDOW).toBe(1);
      expect(mockAuthenticator.options).toMatchObject({
        window: 1,
        step: 30
      });
    });
  });
});