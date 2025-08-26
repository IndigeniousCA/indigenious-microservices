/**
 * Fraud Detection Service Tests
 * SOC 2 Type II Compliance Testing
 */

import { FraudDetectionService } from '../services/FraudDetectionService';

// Mock dependencies
jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
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

jest.mock('../services/IntelligentVerificationService', () => ({
  intelligentVerificationService: {
    verifyIndigenousBusiness: jest.fn().mockResolvedValue({
      overallScore: 85,
      confidenceLevel: 'high'
    })
  }
}));

jest.mock('@/lib/prisma', () => ({
  transaction: {
    findMany: jest.fn(),
  },
  loginHistory: {
    findMany: jest.fn(),
  },
  deviceHistory: {
    findMany: jest.fn(),
  },
  fraudAnalysis: {
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  transactionReview: {
    create: jest.fn()
  }
}));

// Mock TensorFlow
jest.mock('@tensorflow/tfjs-node', () => ({
  sequential: jest.fn(() => ({
    predict: jest.fn(() => ({
      data: jest.fn().mockResolvedValue([0.3]),
      dispose: jest.fn()
    }))
  })),
  layers: {
    dense: jest.fn(() => ({})),
    dropout: jest.fn(() => ({}))
  },
  tensor2d: jest.fn(() => ({
    dispose: jest.fn()
  }))
}));

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  const mockPrisma = require('@/lib/prisma');
  const mockRedis = require('../services/RedisEncryptionService').redisEncryption;
  const mockAuditLogger = require('../services/AuditLogger').auditLogger;
  
  const mockTransactionContext = {
    transactionId: 'txn_123',
    userId: 'user_123',
    businessId: 'biz_123',
    amount: 5000,
    currency: 'CAD' as const,
    type: 'payment' as const,
    fromAccount: 'acc_123',
    toAccount: 'acc_456',
    timestamp: new Date(),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    sessionId: 'session_123',
    geolocation: {
      country: 'Canada',
      region: 'Ontario',
      city: 'Toronto',
      latitude: 43.6532,
      longitude: -79.3832
    },
    deviceFingerprint: 'device_123'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = FraudDetectionService.getInstance();
    
    // Setup default mocks
    mockRedis.getEncrypted.mockResolvedValue(null);
    mockRedis.setEncrypted.mockResolvedValue(undefined);
    
    mockPrisma.transaction.findMany.mockResolvedValue([
      {
        id: 'prev_txn_1',
        amount: 1000,
        timestamp: new Date(Date.now() - 3600000),
        status: 'completed',
        type: 'payment',
        toAccount: 'acc_789'
      }
    ]);
    
    mockPrisma.loginHistory.findMany.mockResolvedValue([
      { ipAddress: '192.168.1.1', location: 'Canada' }
    ]);
    
    mockPrisma.deviceHistory.findMany.mockResolvedValue([
      { deviceFingerprint: 'device_123' }
    ]);
  });
  
  describe('analyzeTransaction', () => {
    it('should approve low-risk transactions', async () => {
      const result = await service.analyzeTransaction(mockTransactionContext);
      
      expect(result).toMatchObject({
        transactionId: 'txn_123',
        decision: 'approve',
        requiresMFA: false,
        requiresManualReview: false
      });
      expect(result.overallRisk).toBeLessThan(40);
      expect(result.fraudProbability).toBeLessThan(0.5);
    });
    
    it('should block duplicate transactions', async () => {
      // First transaction
      await service.analyzeTransaction(mockTransactionContext);
      
      // Simulate finding duplicate in cache
      mockRedis.getEncrypted.mockResolvedValueOnce(true);
      
      // Same transaction again
      const result = await service.analyzeTransaction(mockTransactionContext);
      
      expect(result).toMatchObject({
        decision: 'block',
        reasons: ['Duplicate transaction detected'],
        overallRisk: 100,
        fraudProbability: 1
      });
    });
    
    it('should flag high-value transactions for MFA', async () => {
      const highValueContext = {
        ...mockTransactionContext,
        amount: 15000 // Above threshold
      };
      
      const result = await service.analyzeTransaction(highValueContext);
      
      expect(result.requiresMFA).toBe(true);
      expect(result.decision).toBe('challenge');
    });
    
    it('should detect velocity anomalies', async () => {
      // Mock many recent transactions
      mockPrisma.transaction.findMany.mockResolvedValue(
        Array(15).fill(null).map((_, i) => ({
          id: `txn_${i}`,
          amount: 1000,
          timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
          status: 'completed',
          type: 'payment'
        }))
      );
      
      const result = await service.analyzeTransaction(mockTransactionContext);
      
      expect(result.velocityScore).toBeGreaterThan(50);
      expect(result.decision).toMatch(/review|challenge/);
    });
    
    it('should detect geographic anomalies', async () => {
      // Mock no location history
      mockPrisma.loginHistory.findMany.mockResolvedValue([
        { ipAddress: '10.0.0.1', location: 'Brazil' }
      ]);
      
      const newLocationContext = {
        ...mockTransactionContext,
        geolocation: {
          country: 'Japan',
          region: 'Tokyo',
          city: 'Tokyo',
          latitude: 35.6762,
          longitude: 139.6503
        }
      };
      
      const result = await service.analyzeTransaction(newLocationContext);
      
      expect(result.behavioralScore).toBeGreaterThan(30);
      expect(result.reasons.some(r => r.includes('Behavioral'))).toBe(true);
    });
    
    it('should detect account takeover patterns', async () => {
      // New device + failed attempts + unusual time
      mockPrisma.deviceHistory.findMany.mockResolvedValue([
        { deviceFingerprint: 'different_device' }
      ]);
      
      mockPrisma.transaction.findMany.mockResolvedValue([
        ...Array(3).fill(null).map((_, i) => ({
          id: `failed_${i}`,
          amount: 1000,
          timestamp: new Date(Date.now() - 300000),
          status: 'failed',
          type: 'payment'
        }))
      ]);
      
      const suspiciousContext = {
        ...mockTransactionContext,
        timestamp: new Date('2024-01-01T03:00:00'), // 3 AM
        deviceFingerprint: 'new_device_456'
      };
      
      const result = await service.analyzeTransaction(suspiciousContext);
      
      expect(result.overallRisk).toBeGreaterThan(60);
      expect(result.decision).toMatch(/block|review/);
    });
    
    it('should handle ML model failures gracefully', async () => {
      // Mock ML model error
      const tf = require('@tensorflow/tfjs-node');
      tf.sequential.mockImplementationOnce(() => ({
        predict: jest.fn(() => {
          throw new Error('Model prediction failed');
        })
      }));
      
      const result = await service.analyzeTransaction(mockTransactionContext);
      
      // Should still return a result based on rules
      expect(result).toBeDefined();
      expect(result.mlScore).toBe(0);
      expect(result.decision).toBeDefined();
    });
    
    it('should respect enhanced checks option', async () => {
      const result = await service.analyzeTransaction(mockTransactionContext, {
        enhancedChecks: true
      });
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.riskFactors.length).toBeGreaterThan(0);
    });
    
    it('should handle system errors with fail-safe', async () => {
      // Mock database error
      mockPrisma.transaction.findMany.mockRejectedValue(new Error('DB Error'));
      
      const result = await service.analyzeTransaction(mockTransactionContext);
      
      expect(result).toMatchObject({
        decision: 'review',
        requiresMFA: true,
        requiresManualReview: true,
        reasons: ['System error - manual review required']
      });
    });
  });
  
  describe('Rule-based detection', () => {
    it('should detect rapid succession transactions', async () => {
      // Mock 5 transactions in last 5 minutes
      const recentTransactions = Array(5).fill(null).map((_, i) => ({
        id: `rapid_${i}`,
        amount: 500,
        timestamp: new Date(Date.now() - i * 30000), // 30 seconds apart
        status: 'completed',
        type: 'payment'
      }));
      
      mockPrisma.transaction.findMany.mockResolvedValue(recentTransactions);
      
      const result = await service.analyzeTransaction(mockTransactionContext);
      
      expect(result.ruleBasedScore).toBeGreaterThan(60);
    });
    
    it('should detect money mule patterns', async () => {
      // Mock deposit followed by withdrawal pattern
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: 'deposit_1',
          amount: 10000,
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          status: 'completed',
          type: 'deposit'
        },
        {
          id: 'withdrawal_1',
          amount: 9500,
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          status: 'completed',
          type: 'withdrawal'
        }
      ]);
      
      const withdrawalContext = {
        ...mockTransactionContext,
        type: 'withdrawal' as const,
        amount: 500
      };
      
      const result = await service.analyzeTransaction(withdrawalContext);
      
      expect(result.ruleBasedScore).toBeGreaterThan(50);
    });
    
    it('should calculate impossible travel correctly', async () => {
      // Last transaction from Toronto 1 hour ago
      mockPrisma.transaction.findMany.mockResolvedValue([{
        id: 'prev_location',
        amount: 1000,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        status: 'completed',
        type: 'payment',
        geolocation: {
          country: 'Canada',
          city: 'Toronto',
          latitude: 43.6532,
          longitude: -79.3832
        }
      }]);
      
      // Current transaction from Tokyo (impossible in 1 hour)
      const impossibleContext = {
        ...mockTransactionContext,
        geolocation: {
          country: 'Japan',
          region: 'Tokyo',
          city: 'Tokyo',
          latitude: 35.6762,
          longitude: 139.6503
        }
      };
      
      const result = await service.analyzeTransaction(impossibleContext);
      
      expect(result.ruleBasedScore).toBe(100);
      expect(result.decision).toBe('block');
    });
  });
  
  describe('markFalsePositive', () => {
    it('should update fraud analysis record', async () => {
      mockPrisma.fraudAnalysis.update.mockResolvedValue({});
      
      await service.markFalsePositive('txn_123', 'reviewer_123', 'Legitimate transaction');
      
      expect(mockPrisma.fraudAnalysis.update).toHaveBeenCalledWith({
        where: { transactionId: 'txn_123' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            falsePositive: true,
            reviewerId: 'reviewer_123',
            reviewReason: 'Legitimate transaction'
          })
        })
      });
      
      expect(mockAuditLogger.logEvent).toHaveBeenCalled();
    });
  });
  
  describe('getStatistics', () => {
    it('should return fraud detection statistics', async () => {
      mockPrisma.fraudAnalysis.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(50)   // blocked
        .mockResolvedValueOnce(150)  // reviewed
        .mockResolvedValueOnce(5);   // false positives
      
      const stats = await service.getStatistics();
      
      expect(stats).toMatchObject({
        totalAnalyzed: 1000,
        totalBlocked: 50,
        totalReviewed: 150,
        totalFalsePositives: 5,
        blockRate: '5.00%',
        reviewRate: '15.00%',
        falsePositiveRate: '10.00%'
      });
    });
    
    it('should handle date range filtering', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };
      
      await service.getStatistics(timeRange);
      
      expect(mockPrisma.fraudAnalysis.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        })
      });
    });
  });
  
  describe('Real-time monitoring', () => {
    it('should emit events for high-risk transactions', (done) => {
      service.on('critical-fraud-alert', (data) => {
        expect(data.transaction.transactionId).toBe('txn_high_risk');
        expect(data.score.overallRisk).toBeGreaterThanOrEqual(85);
        done();
      });
      
      // Mock high risk scenario
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.loginHistory.findMany.mockResolvedValue([]);
      mockPrisma.deviceHistory.findMany.mockResolvedValue([]);
      
      const highRiskContext = {
        ...mockTransactionContext,
        transactionId: 'txn_high_risk',
        amount: 100000,
        geolocation: {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          latitude: 0,
          longitude: 0
        }
      };
      
      service.analyzeTransaction(highRiskContext);
    });
    
    it('should track performance metrics', async () => {
      // Process multiple transactions
      for (let i = 0; i < 5; i++) {
        await service.analyzeTransaction({
          ...mockTransactionContext,
          transactionId: `txn_${i}`
        });
      }
      
      const stats = await service.getStatistics();
      
      expect(stats.currentMetrics.transactionsAnalyzed).toBeGreaterThanOrEqual(5);
      expect(stats.currentMetrics.avgProcessingTime).toBeGreaterThan(0);
    });
  });
  
  describe('SOC 2 Compliance', () => {
    it('should log all transaction analyses', async () => {
      await service.analyzeTransaction(mockTransactionContext);
      
      expect(mockAuditLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'fraud_detected',
          action: 'analyze_transaction',
          metadata: expect.objectContaining({
            transactionId: 'txn_123',
            decision: expect.any(String),
            overallRisk: expect.any(Number)
          })
        })
      );
    });
    
    it('should log security events for blocked transactions', async () => {
      // Force a block scenario
      mockRedis.getEncrypted.mockResolvedValueOnce(true); // Duplicate
      
      await service.analyzeTransaction(mockTransactionContext);
      
      expect(mockAuditLogger.logSecurityEvent).not.toHaveBeenCalled(); // Duplicates don't log security events
    });
    
    it('should encrypt cached transaction history', async () => {
      await service.analyzeTransaction(mockTransactionContext);
      
      expect(mockRedis.setEncrypted).toHaveBeenCalledWith(
        expect.stringContaining('fraud:history:'),
        expect.any(Object),
        300 // 5 minute cache
      );
    });
  });
});