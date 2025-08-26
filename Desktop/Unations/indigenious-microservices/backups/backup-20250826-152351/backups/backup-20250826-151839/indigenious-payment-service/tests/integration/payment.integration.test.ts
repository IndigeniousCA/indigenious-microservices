import request from 'supertest';
import app from '../../src/server';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';
import jwt from 'jsonwebtoken';
import nock from 'nock';

// Mock external services
jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');

describe('Payment Service Integration Tests', () => {
  let authToken: string;
  let server: any;

  beforeAll(() => {
    // Generate test auth token
    authToken = jwt.sign(
      {
        userId: 'test-user-123',
        businessId: 'test-business-123',
        role: 'business',
        isIndigenous: true,
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock Stripe API
    nock('https://api.stripe.com')
      .persist()
      .post('/v1/payment_intents')
      .reply(200, {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        status: 'requires_payment_method',
        amount: 11300,
      })
      .post('/v1/customers')
      .reply(200, {
        id: 'cus_test_123',
        email: 'test@indigenous.ca',
      })
      .post('/v1/refunds')
      .reply(200, {
        id: 'refund_test_123',
        status: 'succeeded',
        amount: 5000,
      });
  });

  afterAll(async () => {
    nock.cleanAll();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/payments/create', () => {
    it('should create a payment intent with Stripe', async () => {
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-1',
        externalId: 'pi_test_123',
        amount: 113,
        status: 'pending',
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'stripe',
          metadata: {
            invoiceNumber: 'INV-001',
            province: 'ON',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        payment: {
          id: expect.any(String),
          clientSecret: expect.any(String),
          amount: 113, // With tax
          currency: 'CAD',
          provider: 'stripe',
        },
      });
    });

    it('should create an Interac e-Transfer', async () => {
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-2',
        externalId: 'INT-123456',
        amount: 112,
        status: 'pending',
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'interac',
          metadata: {
            email: 'business@indigenous.ca',
            securityQuestion: 'What is your band number?',
            securityAnswer: '123',
            province: 'BC',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        payment: {
          provider: 'interac',
          additionalData: {
            securityQuestion: 'What is your band number?',
            referenceNumber: expect.any(String),
          },
        },
      });
    });

    it('should apply tax exemption for Indigenous businesses', async () => {
      (prisma.business.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-business-123',
        isIndigenous: true,
        taxExemptStatus: 'APPROVED',
        bandNumber: '456',
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-3',
        amount: 100,
        taxAmount: 0,
      });
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'stripe',
          applyTaxExemption: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.payment.amount).toBe(100); // No tax added
    });

    it('should validate payment amount limits', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000001, // Over limit
          currency: 'CAD',
          provider: 'stripe',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('amount'),
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .send({
          amount: 100,
          currency: 'CAD',
          provider: 'stripe',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/payments/confirm', () => {
    it('should confirm a Stripe payment', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        externalId: 'pi_test_123',
        provider: 'stripe',
        status: 'pending',
      });
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        status: 'completed',
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      nock('https://api.stripe.com')
        .post('/v1/payment_intents/pi_test_123/confirm')
        .reply(200, {
          id: 'pi_test_123',
          status: 'succeeded',
        });

      const response = await request(app)
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'pi_test_123',
          paymentMethodId: 'pm_test_123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        status: 'completed',
      });
    });

    it('should confirm an Interac transfer', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        externalId: 'INT-123',
        provider: 'interac',
        status: 'pending',
        metadata: {
          securityAnswerHash: '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5', // hash of '12345'
        },
      });
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        status: 'completed',
      });
      (redis.del as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'INT-123',
          securityAnswer: '12345',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        status: 'completed',
      });
    });
  });

  describe('POST /api/v1/payments/refund', () => {
    it('should process a full refund', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        externalId: 'pi_test_123',
        provider: 'stripe',
        amount: 113,
        status: 'completed',
      });
      (prisma.refund.create as jest.Mock).mockResolvedValue({
        id: 'refund-1',
        amount: 113,
      });
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        status: 'refunded',
      });

      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'pi_test_123',
          reason: 'requested_by_customer',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        refund: {
          amount: 113,
          status: 'pending',
        },
      });
    });

    it('should process a partial refund', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        externalId: 'pi_test_123',
        provider: 'stripe',
        amount: 113,
        status: 'completed',
      });
      (prisma.refund.create as jest.Mock).mockResolvedValue({
        id: 'refund-2',
        amount: 50,
      });

      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'pi_test_123',
          amount: 50,
          reason: 'partial_refund',
        });

      expect(response.status).toBe(200);
      expect(response.body.refund.amount).toBe(50);
    });

    it('should prevent refund of non-completed payments', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        externalId: 'pi_test_123',
        status: 'pending',
      });

      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'pi_test_123',
          reason: 'requested_by_customer',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot refund');
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should retrieve payment details', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        id: 'payment-1',
        externalId: 'pi_test_123',
        amount: 113,
        taxAmount: 13,
        status: 'completed',
        provider: 'stripe',
        businessId: 'test-business-123',
        createdAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01'),
      });

      const response = await request(app)
        .get('/api/v1/payments/payment-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        payment: {
          id: 'payment-1',
          amount: 113,
          taxAmount: 13,
          status: 'completed',
          provider: 'stripe',
        },
      });
    });

    it('should not retrieve payments from other businesses', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        id: 'payment-2',
        businessId: 'other-business-456',
      });

      const response = await request(app)
        .get('/api/v1/payments/payment-2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/payments', () => {
    it('should list payments for a business', async () => {
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'payment-1',
          amount: 100,
          status: 'completed',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'payment-2',
          amount: 200,
          status: 'pending',
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          limit: 10,
          offset: 0,
          status: 'all',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        payments: expect.arrayContaining([
          expect.objectContaining({ id: 'payment-1' }),
          expect.objectContaining({ id: 'payment-2' }),
        ]),
        total: 2,
      });
    });

    it('should filter payments by status', async () => {
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'payment-1',
          amount: 100,
          status: 'completed',
        },
      ]);

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'completed',
        });

      expect(response.status).toBe(200);
      expect(response.body.payments).toHaveLength(1);
      expect(response.body.payments[0].status).toBe('completed');
    });

    it('should filter payments by date range', async () => {
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'payment-1',
          createdAt: new Date('2024-01-15'),
        },
      ]);

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });
  });

  describe('POST /api/v1/quick-pay/request', () => {
    it('should create a quick pay request for Indigenous business', async () => {
      (prisma.contract.findFirst as jest.Mock).mockResolvedValue({
        id: 'contract-1',
        businessId: 'test-business-123',
        status: 'ACTIVE',
        value: 10000,
        business: {
          isVerified: true,
          isIndigenous: true,
        },
        rfq: {
          issuingOrganization: {
            type: 'GOVERNMENT',
            name: 'Government of Canada',
          },
        },
      });
      (prisma.paymentRequest.create as jest.Mock).mockResolvedValue({
        id: 'quick-pay-1',
        amount: 1000,
        processingFee: 25,
        netAmount: 975,
        estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/v1/quick-pay/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contractId: 'contract-1',
          amount: 1000,
          invoiceNumber: 'INV-123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        paymentRequest: {
          amount: 1000,
          processingFee: 25,
          netAmount: 975,
        },
      });
    });

    it('should reject quick pay for non-government contracts', async () => {
      (prisma.contract.findFirst as jest.Mock).mockResolvedValue({
        id: 'contract-2',
        rfq: {
          issuingOrganization: {
            type: 'PRIVATE',
          },
        },
      });

      const response = await request(app)
        .post('/api/v1/quick-pay/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contractId: 'contract-2',
          amount: 1000,
          invoiceNumber: 'INV-124',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not eligible');
    });
  });

  describe('Webhook Endpoints', () => {
    it('should process Stripe webhook events', async () => {
      const webhookPayload = JSON.stringify({
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
          },
        },
      });

      const signature = 'test-signature';
      
      (prisma.payment.update as jest.Mock).mockResolvedValue({});
      (redis.del as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .post('/webhook/stripe')
        .set('stripe-signature', signature)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });

    it('should process Interac webhook events', async () => {
      const webhookPayload = {
        type: 'transfer.completed',
        data: {
          transferId: 'INT-123',
          timestamp: new Date().toISOString(),
        },
      };

      const timestamp = Date.now().toString();
      const signature = 'test-signature';

      (prisma.payment.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/webhook/interac')
        .set('x-interac-signature', signature)
        .set('x-interac-timestamp', timestamp)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on payment endpoints', async () => {
      // Make 11 requests (limit is 10)
      const requests = Array(11).fill(null).map(() =>
        request(app)
          .post('/api/v1/payments/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 100,
            currency: 'CAD',
            provider: 'stripe',
          })
      );

      const responses = await Promise.all(requests);
      
      // First 10 should succeed (or return normal errors)
      // 11th should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});