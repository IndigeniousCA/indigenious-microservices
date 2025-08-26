import { SecurityLayer } from '../../security/SecurityLayer';
import { createHash } from 'crypto';

describe('SecurityLayer', () => {
  let security: SecurityLayer;
  const testConfig = {
    encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    jwtSecret: 'test-jwt-secret-key',
    apiKeyPrefix: 'bh_test',
    maxRequestSize: 1048576, // 1MB
    rateLimitWindow: 60000, // 1 minute
    suspiciousActivityThreshold: 5
  };

  beforeEach(() => {
    security = new SecurityLayer(testConfig);
  });

  describe('API Key Management', () => {
    it('should generate secure API keys', () => {
      const apiKey = security.generateApiKey({
        name: 'Test API Key',
        permissions: ['read', 'write'],
        rateLimit: 100
      });

      expect(apiKey).toMatch(/^bh_test_[a-f0-9]{32}_[a-f0-9]{64}$/);
    });

    it('should validate legitimate API keys', async () => {
      const apiKey = security.generateApiKey({
        name: 'Test Key',
        permissions: ['read'],
        rateLimit: 60
      });

      const req = {
        headers: {
          'x-api-key': apiKey,
          'x-forwarded-for': '192.168.1.1'
        },
        body: { query: 'test' }
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid API keys', async () => {
      const req = {
        headers: {
          'x-api-key': 'invalid-key',
          'x-forwarded-for': '192.168.1.1'
        },
        body: {}
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle expired API keys', async () => {
      const apiKey = security.generateApiKey({
        name: 'Expired Key',
        permissions: ['read'],
        rateLimit: 60,
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      const req = {
        headers: {
          'x-api-key': apiKey,
          'x-forwarded-for': '192.168.1.1'
        },
        body: {}
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('Request Validation', () => {
    let validApiKey: string;

    beforeEach(() => {
      validApiKey = security.generateApiKey({
        name: 'Valid Key',
        permissions: ['read', 'write'],
        rateLimit: 100
      });
    });

    it('should validate request size', async () => {
      const req = {
        headers: {
          'x-api-key': validApiKey,
          'x-forwarded-for': '192.168.1.1',
          'content-length': 2097152 // 2MB
        },
        body: {}
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Request too large');
    });

    it('should enforce IP whitelist', async () => {
      const restrictedKey = security.generateApiKey({
        name: 'Restricted Key',
        permissions: ['read'],
        rateLimit: 60,
        ipWhitelist: ['10.0.0.1', '10.0.0.2']
      });

      const req = {
        headers: {
          'x-api-key': restrictedKey,
          'x-forwarded-for': '192.168.1.1' // Not in whitelist
        },
        body: {}
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP not authorized');
    });

    it('should block suspicious IPs', async () => {
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await security.validateRequest({
          headers: {
            'x-api-key': 'invalid-key',
            'x-forwarded-for': '192.168.1.100'
          },
          body: {}
        });
      }

      // IP should now be blocked
      const req = {
        headers: {
          'x-api-key': validApiKey,
          'x-forwarded-for': '192.168.1.100'
        },
        body: {}
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per API key', async () => {
      const apiKey = security.generateApiKey({
        name: 'Rate Limited Key',
        permissions: ['read'],
        rateLimit: 5 // 5 requests per minute
      });

      const req = {
        headers: {
          'x-api-key': apiKey,
          'x-forwarded-for': '192.168.1.1'
        },
        body: { query: 'test' }
      };

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const result = await security.validateRequest(req);
        expect(result.valid).toBe(true);
      }

      // Next request should be rate limited
      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should track rate limits per IP', async () => {
      const apiKey1 = security.generateApiKey({
        name: 'Key 1',
        permissions: ['read'],
        rateLimit: 3
      });

      const apiKey2 = security.generateApiKey({
        name: 'Key 2',
        permissions: ['read'],
        rateLimit: 3
      });

      // Use same IP for both keys
      const ip = '192.168.1.50';

      // Exhaust rate limit for first key
      for (let i = 0; i < 3; i++) {
        await security.validateRequest({
          headers: { 'x-api-key': apiKey1, 'x-forwarded-for': ip },
          body: { query: 'test' }
        });
      }

      // Should be rate limited
      let result = await security.validateRequest({
        headers: { 'x-api-key': apiKey1, 'x-forwarded-for': ip },
        body: { query: 'test' }
      });
      expect(result.valid).toBe(false);

      // Different key with same IP should have separate limit
      result = await security.validateRequest({
        headers: { 'x-api-key': apiKey2, 'x-forwarded-for': ip },
        body: { query: 'test' }
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Input Validation and Sanitization', () => {
    let validApiKey: string;

    beforeEach(() => {
      validApiKey = security.generateApiKey({
        name: 'Valid Key',
        permissions: ['read', 'write'],
        rateLimit: 100
      });
    });

    it('should validate search input schema', async () => {
      const req = {
        headers: {
          'x-api-key': validApiKey,
          'x-forwarded-for': '192.168.1.1'
        },
        body: {
          query: 'a'.repeat(501), // Exceeds max length
          filters: { province: 'ON' }
        }
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('String must contain at most 500 character');
    });

    it('should validate hunter control input', async () => {
      const req = {
        headers: {
          'x-api-key': validApiKey,
          'x-forwarded-for': '192.168.1.1'
        },
        body: {
          type: 'invalid_type',
          action: 'start'
        }
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
    });

    it('should sanitize XSS attempts', () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Test',
        description: 'Normal text <iframe src="evil.com"></iframe>',
        onclick: 'javascript:alert(1)',
        data: {
          nested: '<script>nested xss</script>'
        }
      };

      const sanitized = security.sanitizeInput(maliciousInput);

      expect(sanitized.name).toBe('Test');
      expect(sanitized.description).toBe('Normal text ');
      expect(sanitized.onclick).toBe('alert(1)');
      expect(sanitized.data.nested).toBe('');
    });

    it('should preserve safe HTML entities', () => {
      const safeInput = {
        name: 'O\'Brien & Associates',
        description: 'Services include: <consulting> & <development>',
        price: 100.50
      };

      const sanitized = security.sanitizeInput(safeInput);

      expect(sanitized.name).toBe('O\'Brien & Associates');
      expect(sanitized.description).toBe('Services include: <consulting> & <development>');
      expect(sanitized.price).toBe(100.50);
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const sensitiveData = 'This is sensitive information';
      
      const { encrypted, iv } = security.encrypt(sensitiveData);
      
      expect(encrypted).not.toBe(sensitiveData);
      expect(iv).toMatch(/^[a-f0-9]{32}$/);
      
      const decrypted = security.decrypt(encrypted, iv);
      expect(decrypted).toBe(sensitiveData);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const data = 'Same data';
      
      const result1 = security.encrypt(data);
      const result2 = security.encrypt(data);
      
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should fail decryption with wrong IV', () => {
      const data = 'Test data';
      const { encrypted } = security.encrypt(data);
      const wrongIv = 'ffffffffffffffffffffffffffffffff';
      
      expect(() => security.decrypt(encrypted, wrongIv)).toThrow();
    });

    it('should fail decryption with tampered data', () => {
      const data = 'Test data';
      const { encrypted, iv } = security.encrypt(data);
      
      // Tamper with the auth tag
      const parts = encrypted.split(':');
      parts[1] = 'tampered';
      const tampered = parts.join(':');
      
      expect(() => security.decrypt(tampered, iv)).toThrow();
    });
  });

  describe('JWT Token Management', () => {
    it('should generate valid service tokens', () => {
      const token = security.generateServiceToken('hunter-service', ['read', 'write']);
      
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify valid tokens', () => {
      const token = security.generateServiceToken('test-service', ['read']);
      const payload = security.verifyServiceToken(token);
      
      expect(payload).toBeTruthy();
      expect(payload.service).toBe('test-service');
      expect(payload.permissions).toEqual(['read']);
    });

    it('should reject expired tokens', () => {
      // Create a token that's already expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoidGVzdCIsInBlcm1pc3Npb25zIjpbInJlYWQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';
      
      const payload = security.verifyServiceToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should reject tokens with invalid signature', () => {
      const token = security.generateServiceToken('test-service', ['read']);
      const parts = token.split('.');
      parts[2] = 'invalidsignature';
      const invalidToken = parts.join('.');
      
      const payload = security.verifyServiceToken(invalidToken);
      expect(payload).toBeNull();
    });
  });

  describe('Security Monitoring', () => {
    it('should track suspicious activity', async () => {
      const suspiciousIp = '10.0.0.100';
      
      // Make multiple failed requests
      for (let i = 0; i < 4; i++) {
        await security.validateRequest({
          headers: {
            'x-api-key': 'invalid-key',
            'x-forwarded-for': suspiciousIp
          },
          body: {}
        });
      }

      // One more should trigger blocking
      await security.validateRequest({
        headers: {
          'x-api-key': 'invalid-key',
          'x-forwarded-for': suspiciousIp
        },
        body: {}
      });

      // Verify IP is blocked
      const validKey = security.generateApiKey({
        name: 'Valid Key',
        permissions: ['read'],
        rateLimit: 100
      });

      const result = await security.validateRequest({
        headers: {
          'x-api-key': validKey,
          'x-forwarded-for': suspiciousIp
        },
        body: {}
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing headers gracefully', async () => {
      const req = {
        headers: {},
        body: {}
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing API key');
    });

    it('should extract IP from various header formats', async () => {
      const validKey = security.generateApiKey({
        name: 'Test Key',
        permissions: ['read'],
        rateLimit: 100
      });

      // Test X-Forwarded-For with multiple IPs
      let req = {
        headers: {
          'x-api-key': validKey,
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1'
        },
        body: { query: 'test' }
      };

      let result = await security.validateRequest(req);
      expect(result.valid).toBe(true);

      // Test X-Real-IP
      req = {
        headers: {
          'x-api-key': validKey,
          'x-real-ip': '192.168.1.2'
        },
        body: { query: 'test' }
      };

      result = await security.validateRequest(req);
      expect(result.valid).toBe(true);
    });

    it('should handle Bearer token format', async () => {
      const apiKey = security.generateApiKey({
        name: 'Bearer Test',
        permissions: ['read'],
        rateLimit: 100
      });

      const req = {
        headers: {
          'authorization': `Bearer ${apiKey}`,
          'x-forwarded-for': '192.168.1.1'
        },
        body: { query: 'test' }
      };

      const result = await security.validateRequest(req);
      expect(result.valid).toBe(true);
    });
  });
});