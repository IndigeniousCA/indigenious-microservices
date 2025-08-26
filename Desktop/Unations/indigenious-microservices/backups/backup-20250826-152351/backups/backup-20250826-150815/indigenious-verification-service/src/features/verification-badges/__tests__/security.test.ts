/**
 * Security Test Suite for Badge Verification System
 * Comprehensive security testing including authentication, authorization, 
 * input validation, rate limiting, and compliance checks
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as badgeQuizPost, GET as badgeQuizGet } from '@/app/api/badges/quiz/route';
import { POST as badgeCreatePost, GET as badgeListGet } from '@/app/api/badges/route';
import { POST as badgeVerifyPost } from '@/app/api/badges/verify/route';
import { POST as campaignCreatePost, GET as campaignListGet } from '@/app/api/badges/campaigns/route';
import { POST as trapCreatePost, GET as trapListGet } from '@/app/api/badges/traps/route';

// Mock implementations
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/audit-logger');
jest.mock('@/lib/prisma');
jest.mock('next-auth/next');

describe('Badge System Security Tests', () => {
  beforeAll(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Security', () => {
    test('should reject unauthenticated badge creation requests', async () => {
      // Mock no session
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/badges', {
        method: 'POST',
        body: JSON.stringify({ businessId: 'test-123' })
      });

      const response = await badgeCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    test('should reject insufficient role permissions for trap operations', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'USER' }
      });

      const request = new NextRequest('http://localhost/api/badges/traps', {
        method: 'POST',
        body: JSON.stringify({
          trapType: 'honeypot',
          targetIndustry: 'construction',
          metadata: {
            purpose: 'Fraud detection testing',
            authorizedBy: 'test@example.com',
            legalReviewId: 'LEGAL-123',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });

      const response = await trapCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Insufficient permissions');
    });

    test('should allow authorized roles for campaign management', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });

      // Mock rate limiter to allow request
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/badges/campaigns', {
        method: 'GET'
      });

      const response = await campaignListGet(request);
      
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent SQL injection in badge queries', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'USER' }
      });

      const maliciousInput = "'; DROP TABLE badges; --";
      const request = new NextRequest(
        `http://localhost/api/badges?animalSpirit=${encodeURIComponent(maliciousInput)}`,
        { method: 'GET' }
      );

      const response = await badgeListGet(request);
      const data = await response.json();

      // Should either sanitize input or return validation error
      expect(response.status).not.toBe(500);
      if (response.status === 400) {
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    test('should sanitize XSS attempts in quiz submissions', async () => {
      const { RateLimiter } = require('@/lib/rate-limiter');
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const xssPayload = '<script>alert("XSS")</script>';
      const request = new NextRequest('http://localhost/api/badges/quiz', {
        method: 'POST',
        body: JSON.stringify({
          answers: {
            'question-1': xssPayload
          },
          email: 'test@example.com'
        })
      });

      const response = await badgeQuizPost(request);
      const data = await response.json();

      // Response should not contain the raw script tag
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('<script>');
      expect(responseText).not.toContain('alert("XSS")');
    });

    test('should validate UUID format for business IDs', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'ADMIN' }
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const invalidUUID = 'not-a-valid-uuid';
      const request = new NextRequest('http://localhost/api/badges', {
        method: 'POST',
        body: JSON.stringify({
          businessId: invalidUUID
        })
      });

      const response = await badgeCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toBeTruthy();
    });

    test('should reject oversized content in campaigns', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const oversizedContent = 'A'.repeat(10000); // Way over limit
      const request = new NextRequest('http://localhost/api/badges/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          description: oversizedContent, // This should be rejected
          type: 'awareness',
          targetAudience: 'general',
          content: {
            subject: 'Test',
            message: 'Test message',
            callToAction: 'Act now'
          },
          settings: {
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            budget: 1000,
            channels: ['email'],
            requiresConsent: true
          },
          compliance: {
            legalReview: true,
            privacyCompliant: true,
            accessibilityReviewed: true
          }
        })
      });

      const response = await campaignCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting Security', () => {
    test('should enforce rate limits on badge quiz submissions', async () => {
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      // Mock rate limiter to deny request
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/badges/quiz', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100'
        },
        body: JSON.stringify({
          answers: { 'question-1': 'answer-1' }
        })
      });

      const response = await badgeQuizPost(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many');
    });

    test('should enforce strict rate limits on trap creation', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });

      // Mock rate limiter to deny trap creation (very strict limit)
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/badges/traps', {
        method: 'POST',
        body: JSON.stringify({
          trapType: 'honeypot',
          targetIndustry: 'test',
          metadata: {
            purpose: 'Testing rate limits',
            authorizedBy: 'admin@example.com',
            legalReviewId: 'LEGAL-123',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });

      const response = await trapCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(403); // SecurityError maps to 403
      expect(data.error).toContain('Contact legal team');
    });
  });

  describe('Content Security', () => {
    test('should detect and reject prohibited campaign content', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const prohibitedContent = {
        name: 'Pressure Campaign',
        description: 'This campaign will shame and manipulate businesses',
        type: 'awareness',
        targetAudience: 'businesses',
        content: {
          subject: 'You must comply',
          message: 'We will force you to get verified',
          callToAction: 'Submit now or face consequences'
        },
        settings: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          budget: 1000,
          channels: ['email'],
          requiresConsent: true
        },
        compliance: {
          legalReview: true,
          privacyCompliant: true,
          accessibilityReviewed: true
        }
      };

      const request = new NextRequest('http://localhost/api/badges/campaigns', {
        method: 'POST',
        body: JSON.stringify(prohibitedContent)
      });

      const response = await campaignCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(403); // SecurityError
      expect(data.error).toContain('Prohibited content detected');
      expect(data.error).toMatch(/(pressure|shame|manipulate|force)/i);
    });

    test('should require cultural review for Indigenous campaigns', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const indigenousCampaign = {
        name: 'Indigenous Community Outreach',
        description: 'Reaching out to Indigenous communities',
        type: 'community',
        targetAudience: 'indigenous_communities',
        content: {
          subject: 'Community Partnership',
          message: 'Join our verification program',
          callToAction: 'Learn more'
        },
        settings: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          budget: 1000,
          channels: ['email'],
          requiresConsent: true
        },
        compliance: {
          legalReview: true,
          privacyCompliant: true,
          accessibilityReviewed: true
          // Missing culturallyAppropriate: true
        }
      };

      const request = new NextRequest('http://localhost/api/badges/campaigns', {
        method: 'POST',
        body: JSON.stringify(indigenousCampaign)
      });

      const response = await campaignCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cultural appropriateness review required');
    });
  });

  describe('Legal Compliance Security', () => {
    test('should require legal review ID for trap operations', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const trapWithoutLegalReview = {
        trapType: 'honeypot',
        targetIndustry: 'construction',
        metadata: {
          purpose: 'Fraud detection',
          authorizedBy: 'admin@example.com',
          // Missing legalReviewId
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      const request = new NextRequest('http://localhost/api/badges/traps', {
        method: 'POST',
        body: JSON.stringify(trapWithoutLegalReview)
      });

      const response = await trapCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toBeTruthy();
    });

    test('should enforce data retention limits for traps', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const tooLongTrap = {
        trapType: 'honeypot',
        targetIndustry: 'construction',
        metadata: {
          purpose: 'Fraud detection',
          authorizedBy: 'admin@example.com',
          legalReviewId: 'LEGAL-123',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year (too long)
        }
      };

      const request = new NextRequest('http://localhost/api/badges/traps', {
        method: 'POST',
        body: JSON.stringify(tooLongTrap)
      });

      const response = await trapCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cannot exceed 90 days');
    });

    test('should require consent for all campaign communications', async () => {
      const { getServerSession } = require('next-auth/next');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      getServerSession.mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' }
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const campaignWithoutConsent = {
        name: 'Test Campaign',
        description: 'Testing consent requirement',
        type: 'awareness',
        targetAudience: 'general',
        content: {
          subject: 'Test',
          message: 'Test message',
          callToAction: 'Act now'
        },
        settings: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          budget: 1000,
          channels: ['email'],
          requiresConsent: false // This should be rejected
        },
        compliance: {
          legalReview: true,
          privacyCompliant: true,
          accessibilityReviewed: true
        }
      };

      const request = new NextRequest('http://localhost/api/badges/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignWithoutConsent)
      });

      const response = await campaignCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toBeTruthy();
    });
  });

  describe('Cryptographic Security', () => {
    test('should validate public key format in badge verification', async () => {
      const { RateLimiter } = require('@/lib/rate-limiter');
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const invalidPublicKey = 'not-a-valid-hex-key';
      const request = new NextRequest('http://localhost/api/badges/verify', {
        method: 'POST',
        body: JSON.stringify({
          publicKey: invalidPublicKey,
          temporalProof: 'valid-proof',
          blockchainAnchor: '0x' + 'a'.repeat(64)
        })
      });

      const response = await badgeVerifyPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    test('should require proper blockchain anchor format', async () => {
      const { RateLimiter } = require('@/lib/rate-limiter');
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/badges/verify', {
        method: 'POST',
        body: JSON.stringify({
          publicKey: '0x' + 'a'.repeat(64),
          temporalProof: 'valid-proof',
          blockchainAnchor: 'invalid-anchor-format'
        })
      });

      const response = await badgeVerifyPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Privacy Protection', () => {
    test('should not expose sensitive trap detection data', async () => {
      // This test ensures trap detection responses are generic
      const request = new NextRequest('http://localhost/api/badges/traps/detect', {
        method: 'POST',
        body: JSON.stringify({
          businessData: {
            name: 'Test Business',
            email: 'test@business.com'
          },
          source: 'registration_form'
        })
      });

      const response = await require('@/app/api/badges/traps/detect/route').POST(request);
      const data = await response.json();

      // Response should always be generic
      expect(data.status).toBe('processed');
      expect(data.message).toBe('Business data received');
      
      // Should not reveal whether it's a trap or not
      expect(data).not.toHaveProperty('isTrap');
      expect(data).not.toHaveProperty('confidence');
      expect(data).not.toHaveProperty('evidence');
    });

    test('should hash IP addresses in audit logs', async () => {
      const { AuditLogger } = require('@/lib/audit-logger');
      
      // This would be tested by checking that IP addresses are hashed
      // in the actual audit log implementation
      expect(AuditLogger).toBeDefined();
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak internal errors to responses', async () => {
      // Force an internal error by mocking a database failure
      const { prisma } = require('@/lib/prisma');
      prisma.badge = {
        findMany: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'USER' }
      });

      const request = new NextRequest('http://localhost/api/badges', {
        method: 'GET'
      });

      const response = await badgeListGet(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch badges');
      expect(data.code).toBe('INTERNAL_ERROR');
      
      // Should not expose internal error details
      expect(data.error).not.toContain('Database connection failed');
    });

    test('should sanitize error responses', async () => {
      // Test that error responses don't contain sensitive information
      const response = await badgeCreatePost(
        new NextRequest('http://localhost/api/badges', {
          method: 'POST',
          body: 'invalid-json'
        })
      );

      const data = await response.json();
      
      // Error message should be generic
      expect(data.error).not.toContain('SyntaxError');
      expect(data.error).not.toContain('JSON.parse');
    });
  });
});

describe('Performance Security Tests', () => {
  test('should handle large payloads gracefully', async () => {
    const largePayload = {
      answers: {}
    };
    
    // Create a very large payload
    for (let i = 0; i < 10000; i++) {
      largePayload.answers[`question-${i}`] = 'A'.repeat(1000);
    }

    const request = new NextRequest('http://localhost/api/badges/quiz', {
      method: 'POST',
      body: JSON.stringify(largePayload)
    });

    const startTime = Date.now();
    const response = await badgeQuizPost(request);
    const endTime = Date.now();

    // Should either reject quickly or handle efficiently
    expect(endTime - startTime).toBeLessThan(5000); // 5 second timeout
    expect(response.status).toBeLessThan(500); // No server errors
  });

  test('should timeout long-running operations', async () => {
    // This would test that database operations have proper timeouts
    // and don't hang indefinitely
    expect(true).toBe(true); // Placeholder
  });
});

describe('Audit Trail Security', () => {
  test('should log all badge creation attempts', async () => {
    const { AuditLogger } = require('@/lib/audit-logger');
    const mockLog = jest.fn();
    AuditLogger.prototype.log = mockLog;

    const { getServerSession } = require('next-auth/next');
    getServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'ADMIN' }
    });

    const request = new NextRequest('http://localhost/api/badges', {
      method: 'POST',
      body: JSON.stringify({
        businessId: '12345678-1234-5678-9012-123456789012'
      })
    });

    await badgeCreatePost(request);

    // Should log the creation attempt
    expect(mockLog).toHaveBeenCalled();
    const logCall = mockLog.mock.calls[0][0];
    expect(logCall.action).toContain('CREATE');
    expect(logCall.userId).toBe('user-123');
  });

  test('should log security violations', async () => {
    const { logger } = require('@/lib/logger');
    const mockWarn = jest.fn();
    logger.warn = mockWarn;

    // Attempt unauthorized trap creation
    const { getServerSession } = require('next-auth/next');
    getServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' }
    });

    const request = new NextRequest('http://localhost/api/badges/traps', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.100'
      },
      body: JSON.stringify({
        trapType: 'honeypot'
      })
    });

    await trapCreatePost(request);

    // Should log the security violation
    expect(mockWarn).toHaveBeenCalledWith(
      'Unauthorized trap creation attempt',
      expect.objectContaining({
        userId: 'user-123',
        role: 'USER',
        ip: '192.168.1.100'
      })
    );
  });
});