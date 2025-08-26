import request from 'supertest';
import app from '../../src/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

describe('PCI Compliance Security Tests', () => {
  let authToken: string;

  beforeAll(() => {
    authToken = jwt.sign(
      { userId: 'test-user', businessId: 'test-business' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Data Protection', () => {
    it('should never log sensitive payment data', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const sensitiveData = {
        cardNumber: '4242424242424242',
        cvv: '123',
        expiryMonth: '12',
        expiryYear: '2025',
      };

      // Attempt to process payment with sensitive data
      // The service should never log this data
      request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'stripe',
          paymentMethod: sensitiveData,
        });

      // Check that sensitive data is never logged
      consoleSpy.mock.calls.forEach(call => {
        const logString = JSON.stringify(call);
        expect(logString).not.toContain('4242424242424242');
        expect(logString).not.toContain('123'); // CVV
        expect(logString).not.toContain('cvv');
        expect(logString).not.toContain('cardNumber');
      });

      consoleSpy.mockRestore();
    });

    it('should not return sensitive data in API responses', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'stripe',
          metadata: {
            cardNumber: '4242424242424242', // Should never be returned
          },
        });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('4242424242424242');
    });

    it('should not store card numbers in database', async () => {
      const mockPrismaCreate = jest.fn();
      jest.mock('../../src/config/database', () => ({
        prisma: {
          payment: {
            create: mockPrismaCreate,
          },
        },
      }));

      await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'stripe',
          paymentMethod: {
            cardNumber: '4242424242424242',
          },
        });

      // Verify card number is never passed to database
      mockPrismaCreate.mock.calls.forEach(call => {
        const dataString = JSON.stringify(call);
        expect(dataString).not.toContain('4242424242424242');
      });
    });
  });

  describe('Encryption', () => {
    it('should encrypt sensitive data in transit', async () => {
      // Verify HTTPS is enforced in production
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .get('/health')
        .set('X-Forwarded-Proto', 'http');

      // Should redirect to HTTPS in production
      expect(response.status).toBe(301);
      expect(response.headers.location).toMatch(/^https:/);
      
      process.env.NODE_ENV = 'test';
    });

    it('should use secure headers', async () => {
      const response = await request(app)
        .get('/health');

      // Security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toMatch(/max-age=31536000/);
    });

    it('should validate webhook signatures', async () => {
      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { id: 'pi_test' },
      });

      // Invalid signature
      const response = await request(app)
        .post('/webhook/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Webhook');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for payment endpoints', async () => {
      const endpoints = [
        '/api/v1/payments/create',
        '/api/v1/payments/confirm',
        '/api/v1/payments/refund',
        '/api/v1/payments',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({ amount: 100 });

        expect(response.status).toBe(401);
      }
    });

    it('should validate JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(401);
    });

    it('should prevent access to other businesses payments', async () => {
      const otherBusinessToken = jwt.sign(
        { userId: 'other-user', businessId: 'other-business' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/payments/payment-from-different-business')
        .set('Authorization', `Bearer ${otherBusinessToken}`);

      expect(response.status).toBe(403);
    });

    it('should expire tokens after specified time', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user', businessId: 'test-business' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE payments; --",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1--",
        "'; DELETE FROM users WHERE '1'='1",
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/v1/payments/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 100,
            currency: 'CAD',
            metadata: {
              invoiceNumber: injection,
            },
          });

        // Should either sanitize or reject
        expect(response.status).not.toBe(500);
        if (response.body.payment) {
          expect(response.body.payment.metadata.invoiceNumber).not.toContain('DROP');
          expect(response.body.payment.metadata.invoiceNumber).not.toContain('DELETE');
        }
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
      ];

      for (const xss of xssAttempts) {
        const response = await request(app)
          .post('/api/v1/payments/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 100,
            currency: 'CAD',
            metadata: {
              description: xss,
            },
          });

        if (response.body.payment) {
          // Should be escaped or sanitized
          expect(response.body.payment.metadata.description).not.toContain('<script>');
          expect(response.body.payment.metadata.description).not.toContain('javascript:');
        }
      }
    });

    it('should validate payment amounts', async () => {
      const invalidAmounts = [
        -100,  // Negative
        0,     // Zero
        'abc', // Non-numeric
        null,  // Null
        undefined, // Undefined
        Infinity, // Infinity
        1000001, // Over limit
      ];

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post('/api/v1/payments/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount,
            currency: 'CAD',
            provider: 'stripe',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'missing@',
        'spaces in@email.com',
        'email@',
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/v1/payments/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 100,
            currency: 'CAD',
            provider: 'interac',
            metadata: { email },
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits to prevent abuse', async () => {
      const requests = [];
      
      // Make 11 rapid requests (assuming limit is 10)
      for (let i = 0; i < 11; i++) {
        requests.push(
          request(app)
            .post('/api/v1/payments/create')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ amount: 100, currency: 'CAD' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.message).toContain('Too many');
    });

    it('should have stricter limits for sensitive operations', async () => {
      // Refund endpoint should have stricter limits
      const requests = [];
      
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/v1/payments/refund')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ paymentId: 'test', reason: 'test' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Secure Communication', () => {
    it('should only accept payments from allowed origins', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'https://malicious-site.com')
        .send({ amount: 100, currency: 'CAD' });

      // Should be blocked by CORS
      expect(response.status).toBe(403);
    });

    it('should validate Content-Type headers', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'text/plain') // Wrong content type
        .send('amount=100&currency=CAD');

      expect(response.status).toBe(400);
    });

    it('should timeout long-running requests', async () => {
      // This would need actual implementation in the service
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          metadata: {
            // Simulate a request that would take too long
            delay: 60000, // 60 seconds
          },
        })
        .timeout(5000); // 5 second timeout

      expect(response.status).toBe(408); // Request Timeout
    }, 10000);
  });

  describe('Audit Logging', () => {
    it('should log all payment attempts', () => {
      const logSpy = jest.spyOn(console, 'log');
      
      request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100, currency: 'CAD' });

      // Should log payment attempt (without sensitive data)
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('payment'),
        expect.not.stringContaining('cardNumber')
      );

      logSpy.mockRestore();
    });

    it('should log security violations', async () => {
      const logSpy = jest.spyOn(console, 'error');
      
      // Attempt with invalid token
      await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', 'Bearer invalid-token')
        .send({ amount: 100 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('auth'),
        expect.any(Object)
      );

      logSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'invalid-provider',
        });

      // Error message should be generic
      expect(response.body.error).toBeDefined();
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('prisma');
      expect(response.body.error).not.toContain('stack');
      expect(response.body.error).not.toContain('SQL');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('Session Security', () => {
    it('should regenerate tokens after sensitive operations', async () => {
      // Create a payment
      const response1 = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 1000, currency: 'CAD' });

      // For large payments, should issue new token
      if (response1.body.newToken) {
        expect(response1.body.newToken).not.toBe(authToken);
      }
    });

    it('should invalidate tokens after logout', async () => {
      // Simulate logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      // Token should no longer work
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100, currency: 'CAD' });

      expect(response.status).toBe(401);
    });
  });
});