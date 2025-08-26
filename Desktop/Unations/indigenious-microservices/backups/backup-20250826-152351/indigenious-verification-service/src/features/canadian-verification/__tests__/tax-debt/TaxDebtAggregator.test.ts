/**
 * Tax Debt Aggregator Test Suite
 * 
 * @module TaxDebtAggregatorTests
 * @description Comprehensive test suite for tax debt verification system
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import Redis from 'ioredis-mock';
import { TaxDebtAggregator } from '../../services/TaxDebtAggregator';
import { CRAAgent } from '../../services/agents/CRAAgent';
import { QuebecAgent } from '../../services/agents/QuebecAgent';
import { OntarioAgent } from '../../services/agents/OntarioAgent';
import {
  TaxDebtVerificationRequest,
  TaxDebtVerificationResponse,
  FederalTaxDebt,
  ProvincialTaxDebt,
  TaxDebtDetails
} from '../../types/tax-debt';

// Mock agents
jest.mock('../../services/agents/CRAAgent');
jest.mock('../../services/agents/QuebecAgent');
jest.mock('../../services/agents/OntarioAgent');

describe('TaxDebtAggregator', () => {
  let aggregator: TaxDebtAggregator;
  let mockRedis: Redis;
  let mockCRAAgent: jest.Mocked<CRAAgent>;
  let mockQuebecAgent: jest.Mocked<QuebecAgent>;
  let mockOntarioAgent: jest.Mocked<OntarioAgent>;
  let mockLogger: any;

  beforeEach(() => {
    // Setup mocks
    mockRedis = new Redis();
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Create mock agents
    mockCRAAgent = new CRAAgent() as jest.Mocked<CRAAgent>;
    mockQuebecAgent = new QuebecAgent() as jest.Mocked<QuebecAgent>;
    mockOntarioAgent = new OntarioAgent() as jest.Mocked<OntarioAgent>;

    // Setup provincial agents map
    const provincialAgents = new Map();
    provincialAgents.set('QC', mockQuebecAgent);
    provincialAgents.set('ON', mockOntarioAgent);

    // Create aggregator
    aggregator = new TaxDebtAggregator(
      {
        redis: mockRedis,
        logger: mockLogger,
        concurrencyLimit: 2,
        cacheEnabled: true,
        cacheTTL: 3600,
        auditEnabled: true
      },
      mockCRAAgent,
      provincialAgents
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyTaxDebt', () => {
    const validRequest: TaxDebtVerificationRequest = {
      businessNumber: '123456789RC0001',
      businessName: 'Test Company Inc.',
      provinces: ['QC', 'ON'],
      includePaymentArrangements: true,
      includeCollectionsStatus: true,
      includeFilingCompliance: true,
      yearsToCheck: 5,
      consent: {
        obtained: true,
        consentDate: new Date(),
        consentNumber: 'CONSENT-2025-001',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    };

    it('should successfully verify tax debt across all jurisdictions', async () => {
      // Mock federal tax debt response
      const mockFederalDebt: FederalTaxDebt = {
        corporateTax: {
          items: [{
            taxType: 'Corporate Income Tax',
            amountOwing: 50000,
            originalAmount: 45000,
            penaltiesInterest: 5000,
            periodStart: new Date('2024-01-01'),
            periodEnd: new Date('2024-12-31'),
            dueDate: new Date('2025-04-30'),
            filingStatus: 'filed',
            assessmentNumber: 'T2-2024-001'
          }],
          totalOwing: 50000,
          oldestDebt: new Date('2024-01-01')
        },
        gstHst: {
          items: [],
          totalOwing: 0,
          registrationNumber: '123456789RT0001',
          filingFrequency: 'quarterly'
        },
        totalFederalOwing: 50000,
        riskScore: 25
      };

      // Mock Quebec tax debt response
      const mockQuebecDebt: ProvincialTaxDebt = {
        province: 'QC',
        provincialCorporateTax: {
          items: [{
            taxType: 'Impôt des sociétés',
            amountOwing: 25000,
            originalAmount: 22000,
            penaltiesInterest: 3000,
            periodStart: new Date('2024-01-01'),
            periodEnd: new Date('2024-12-31'),
            dueDate: new Date('2025-06-15'),
            filingStatus: 'filed'
          }],
          totalOwing: 25000
        },
        salesTax: {
          items: [],
          totalOwing: 0,
          taxType: 'QST'
        },
        totalProvincialOwing: 25000,
        riskScore: 20
      };

      // Mock Ontario tax debt response
      const mockOntarioDebt: ProvincialTaxDebt = {
        province: 'ON',
        provincialCorporateTax: {
          items: [],
          totalOwing: 0
        },
        totalProvincialOwing: 0,
        riskScore: 0
      };

      // Setup mocks
      mockCRAAgent.verifyTaxDebt = jest.fn().mockResolvedValue(mockFederalDebt);
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockResolvedValue(mockQuebecDebt);
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockResolvedValue(mockOntarioDebt);

      // Execute
      const response = await aggregator.verifyTaxDebt(validRequest);

      // Verify
      expect(response).toBeDefined();
      expect(response.taxDebtDetails).toBeDefined();
      expect(response.taxDebtDetails.totalOwingAllJurisdictions).toBe(75000);
      expect(response.taxDebtDetails.jurisdictionsWithDebt).toContain('Federal');
      expect(response.taxDebtDetails.jurisdictionsWithDebt).toContain('QC');
      expect(response.taxDebtDetails.jurisdictionsWithDebt).not.toContain('ON');
      expect(response.procurementEligibility.eligible).toBe(true); // Under $500k threshold
      expect(response.procurementEligibility.conditions).toContain('Payment arrangement must be in place and current');
    });

    it('should handle federal verification failure gracefully', async () => {
      // Mock federal failure
      mockCRAAgent.verifyTaxDebt = jest.fn().mockRejectedValue(new Error('CRA API unavailable'));
      
      // Mock successful provincial responses
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockResolvedValue({
        province: 'QC',
        totalProvincialOwing: 0
      });
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockResolvedValue({
        province: 'ON',
        totalProvincialOwing: 0
      });

      // Execute
      const response = await aggregator.verifyTaxDebt(validRequest);

      // Verify
      expect(response).toBeDefined();
      expect(response.taxDebtDetails.federal.error).toBe('CRA API unavailable');
      expect(response.taxDebtDetails.confidenceScore).toBeLessThan(100);
    });

    it('should enforce consent requirements', async () => {
      // Invalid consent
      const invalidRequest: TaxDebtVerificationRequest = {
        ...validRequest,
        consent: {
          obtained: false,
          consentDate: new Date(),
          consentNumber: '',
          expiryDate: new Date() // Already expired
        }
      };

      // Execute and expect error
      await expect(aggregator.verifyTaxDebt(invalidRequest)).rejects.toThrow('Valid consent required');
    });

    it('should mark business as ineligible for critical debt levels', async () => {
      // Mock critical debt
      const mockCriticalDebt: FederalTaxDebt = {
        ...mockFederalDebt,
        totalFederalOwing: 750000, // Over $500k
        payrollDeductions: {
          items: [{
            taxType: 'Payroll Deductions',
            amountOwing: 100000,
            originalAmount: 90000,
            penaltiesInterest: 10000,
            periodStart: new Date('2024-01-01'),
            periodEnd: new Date('2024-12-31'),
            dueDate: new Date('2025-01-15'),
            filingStatus: 'unfiled'
          }],
          totalOwing: 100000
        },
        collectionsStatus: {
          stage: 'legal_action',
          totalUnderCollections: 750000,
          actions: [{
            actionType: 'legal_action',
            actionDate: new Date(),
            actionNumber: 'LA-2025-001',
            amount: 750000,
            status: 'active'
          }],
          priorityLevel: 'critical'
        },
        riskScore: 95
      };

      mockCRAAgent.verifyTaxDebt = jest.fn().mockResolvedValue(mockCriticalDebt);
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ province: 'QC', totalProvincialOwing: 0 });
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ province: 'ON', totalProvincialOwing: 0 });

      // Execute
      const response = await aggregator.verifyTaxDebt(validRequest);

      // Verify
      expect(response.procurementEligibility.eligible).toBe(false);
      expect(response.procurementEligibility.reasons).toContain('Tax debt exceeds $500,000 threshold');
      expect(response.procurementEligibility.reasons).toContain('Legal action in progress for tax debt');
      expect(response.taxDebtDetails.riskLevel).toBe('critical');
    });

    it('should utilize cache for repeated requests', async () => {
      // Mock responses
      mockCRAAgent.verifyTaxDebt = jest.fn().mockResolvedValue(mockFederalDebt);
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ province: 'QC', totalProvincialOwing: 0 });
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ province: 'ON', totalProvincialOwing: 0 });

      // First request
      const response1 = await aggregator.verifyTaxDebt(validRequest);
      expect(mockCRAAgent.verifyTaxDebt).toHaveBeenCalledTimes(1);

      // Second request (should use cache)
      const response2 = await aggregator.verifyTaxDebt(validRequest);
      expect(mockCRAAgent.verifyTaxDebt).toHaveBeenCalledTimes(1); // Still 1
      expect(response2).toEqual(response1);
    });

    it('should handle circuit breaker opening on repeated failures', async () => {
      // Mock consistent failures
      mockCRAAgent.verifyTaxDebt = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Make multiple requests to trigger circuit breaker
      for (let i = 0; i < 10; i++) {
        try {
          await aggregator.verifyTaxDebt(validRequest);
        } catch (error) {
          // Expected failures
        }
      }

      // Verify circuit breaker is open
      expect(mockLogger.error).toHaveBeenCalledWith('Tax debt aggregator circuit breaker opened');
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate accurate risk scores based on debt factors', async () => {
      const scenarios = [
        {
          name: 'Low risk',
          federalDebt: { totalFederalOwing: 5000 },
          provincialDebt: [{ province: 'QC', totalProvincialOwing: 2000 }],
          expectedLevel: 'low'
        },
        {
          name: 'Medium risk',
          federalDebt: { 
            totalFederalOwing: 75000,
            corporateTax: {
              filingCompliance: { outstandingReturns: 2 }
            }
          },
          provincialDebt: [{ province: 'QC', totalProvincialOwing: 25000 }],
          expectedLevel: 'medium'
        },
        {
          name: 'High risk',
          federalDebt: { 
            totalFederalOwing: 250000,
            payrollDeductions: { totalOwing: 50000 },
            collectionsStatus: { stage: 'collections' }
          },
          provincialDebt: [{ province: 'QC', totalProvincialOwing: 50000 }],
          expectedLevel: 'high'
        },
        {
          name: 'Critical risk',
          federalDebt: { 
            totalFederalOwing: 600000,
            payrollDeductions: { totalOwing: 100000 },
            collectionsStatus: { stage: 'legal_action' }
          },
          provincialDebt: [
            { province: 'QC', totalProvincialOwing: 200000 },
            { province: 'ON', totalProvincialOwing: 150000 }
          ],
          expectedLevel: 'critical'
        }
      ];

      for (const scenario of scenarios) {
        mockCRAAgent.verifyTaxDebt = jest.fn().mockResolvedValue(scenario.federalDebt);
        
        // Mock provincial responses
        scenario.provincialDebt.forEach((debt, index) => {
          const agent = index === 0 ? mockQuebecAgent : mockOntarioAgent;
          agent.verifyTaxDebt = jest.fn().mockResolvedValue(debt);
        });

        const response = await aggregator.verifyTaxDebt({
          ...validRequest,
          provinces: scenario.provincialDebt.map(d => d.province)
        });

        expect(response.taxDebtDetails.riskLevel).toBe(scenario.expectedLevel);
      }
    });
  });

  describe('Audit Trail', () => {
    it('should create comprehensive audit trail for tax debt access', async () => {
      // Mock responses
      mockCRAAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ totalFederalOwing: 0 });
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ province: 'QC', totalProvincialOwing: 0 });
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ province: 'ON', totalProvincialOwing: 0 });

      // Execute
      await aggregator.verifyTaxDebt(validRequest);

      // Verify audit logging
      const auditKeys = await mockRedis.zrange('tax-debt:audit-log', 0, -1);
      expect(auditKeys.length).toBeGreaterThan(0);
      
      const auditEntry = JSON.parse(auditKeys[0]);
      expect(auditEntry).toHaveProperty('eventId');
      expect(auditEntry).toHaveProperty('timestamp');
      expect(auditEntry).toHaveProperty('businessNumber');
    });
  });

  describe('Performance', () => {
    it('should complete verification within SLA timeframe', async () => {
      // Mock delayed responses
      mockCRAAgent.verifyTaxDebt = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ totalFederalOwing: 0 }), 100))
      );
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ province: 'QC', totalProvincialOwing: 0 }), 100))
      );
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ province: 'ON', totalProvincialOwing: 0 }), 100))
      );

      const startTime = Date.now();
      await aggregator.verifyTaxDebt(validRequest);
      const duration = Date.now() - startTime;

      // Should complete within 2 seconds (SLA)
      expect(duration).toBeLessThan(2000);
    });

    it('should respect concurrency limits', async () => {
      let concurrentCalls = 0;
      let maxConcurrent = 0;

      // Mock with concurrency tracking
      const trackConcurrency = async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCalls--;
        return { province: 'QC', totalProvincialOwing: 0 };
      };

      mockCRAAgent.verifyTaxDebt = jest.fn().mockImplementation(trackConcurrency);
      mockQuebecAgent.verifyTaxDebt = jest.fn().mockImplementation(trackConcurrency);
      mockOntarioAgent.verifyTaxDebt = jest.fn().mockImplementation(trackConcurrency);

      await aggregator.verifyTaxDebt(validRequest);

      // Verify concurrency limit was respected (set to 2 in beforeEach)
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });
});

describe('TaxDebtAggregator Security', () => {
  let aggregator: TaxDebtAggregator;
  let mockRedis: Redis;
  let mockCRAAgent: jest.Mocked<CRAAgent>;

  beforeEach(() => {
    mockRedis = new Redis();
    mockCRAAgent = new CRAAgent() as jest.Mocked<CRAAgent>;
    
    aggregator = new TaxDebtAggregator(
      {
        redis: mockRedis,
        encryptionKey: 'test-encryption-key-32-bytes-long',
        auditEnabled: true
      },
      mockCRAAgent,
      new Map()
    );
  });

  it('should encrypt cached tax debt data', async () => {
    const sensitiveData: FederalTaxDebt = {
      totalFederalOwing: 100000,
      corporateTax: {
        items: [{
          taxType: 'Corporate Income Tax',
          amountOwing: 100000,
          assessmentNumber: 'CONFIDENTIAL-123'
        }]
      }
    };

    mockCRAAgent.verifyTaxDebt = jest.fn().mockResolvedValue(sensitiveData);

    // Execute
    await aggregator.verifyTaxDebt({
      businessNumber: '123456789RC0001',
      businessName: 'Test Company',
      provinces: [],
      consent: {
        obtained: true,
        consentDate: new Date(),
        consentNumber: 'TEST-001',
        expiryDate: new Date(Date.now() + 86400000)
      }
    });

    // Verify encryption
    const cacheKey = 'tax-debt:123456789RC0001:5';
    const cachedData = await mockRedis.get(cacheKey);
    
    // Should not contain plaintext sensitive data
    expect(cachedData).not.toContain('CONFIDENTIAL-123');
    expect(cachedData).not.toContain('100000');
  });

  it('should sanitize input to prevent injection attacks', async () => {
    const maliciousRequest: TaxDebtVerificationRequest = {
      businessNumber: '123456789RC0001"; DROP TABLE businesses; --',
      businessName: '<script>alert("XSS")</script>',
      provinces: ['QC'],
      consent: {
        obtained: true,
        consentDate: new Date(),
        consentNumber: 'CONSENT-001',
        expiryDate: new Date(Date.now() + 86400000)
      }
    };

    mockCRAAgent.verifyTaxDebt = jest.fn().mockResolvedValue({ totalFederalOwing: 0 });

    // Should handle malicious input safely
    await expect(aggregator.verifyTaxDebt(maliciousRequest)).rejects.toThrow();
  });
});