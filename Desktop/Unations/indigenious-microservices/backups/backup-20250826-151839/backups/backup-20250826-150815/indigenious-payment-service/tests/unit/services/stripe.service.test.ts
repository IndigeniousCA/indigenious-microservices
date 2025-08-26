import { StripeService } from '../../../src/services/stripe.service';
import Stripe from 'stripe';
import { prisma } from '../../../src/config/database';
import { redis } from '../../../src/config/redis';
import { calculateTax } from '../../../src/services/tax.service';

// Mock dependencies
jest.mock('stripe');
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/services/tax.service');
jest.mock('../../../src/utils/logger');

describe('StripeService', () => {
  let stripeService: StripeService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    jest.clearAllMocks();
    stripeService = new StripeService();
    mockStripe = (Stripe as any).mock.instances[0];
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent with tax calculation', async () => {
      const amount = 100;
      const currency = 'CAD';
      const metadata = { businessId: 'test-business', province: 'ON' };
      const taxAmount = 13;

      (calculateTax as jest.Mock).mockResolvedValue(taxAmount);
      
      mockStripe.paymentIntents = {
        create: jest.fn().mockResolvedValue({
          id: 'pi_test123',
          client_secret: 'secret_test123',
          status: 'requires_payment_method',
          amount: 11300,
        }),
      } as any;

      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-1',
        externalId: 'pi_test123',
        amount: 113,
      });

      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await stripeService.createPaymentIntent(amount, currency, metadata);

      expect(calculateTax).toHaveBeenCalledWith(amount, 'ON');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 11300,
        currency: 'cad',
        metadata: expect.objectContaining({
          provider: 'stripe',
          businessId: 'test-business',
          originalAmount: '100',
          taxAmount: '13',
        }),
        automatic_payment_methods: { enabled: true },
        capture_method: 'automatic',
      });

      expect(result).toEqual({
        id: 'pi_test123',
        clientSecret: 'secret_test123',
        amount: 113,
        currency: 'CAD',
        status: 'pending',
        provider: 'stripe',
      });
    });

    it('should handle payment intent creation failure', async () => {
      (calculateTax as jest.Mock).mockResolvedValue(0);
      
      mockStripe.paymentIntents = {
        create: jest.fn().mockRejectedValue(new Error('Stripe error')),
      } as any;

      await expect(
        stripeService.createPaymentIntent(100, 'CAD', {})
      ).rejects.toThrow('Stripe payment intent creation failed');
    });

    it('should apply Indigenous business preferences', async () => {
      const metadata = {
        businessId: 'indigenous-business',
        isIndigenous: true,
        province: 'BC',
      };

      (calculateTax as jest.Mock).mockResolvedValue(0); // Tax exempt
      
      mockStripe.paymentIntents = {
        create: jest.fn().mockResolvedValue({
          id: 'pi_indigenous',
          client_secret: 'secret_indigenous',
          status: 'requires_payment_method',
          amount: 10000,
        }),
      } as any;

      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      await stripeService.createPaymentIntent(100, 'CAD', metadata);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            isIndigenous: true,
            taxAmount: '0',
          }),
        })
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a payment successfully', async () => {
      const paymentIntentId = 'pi_test123';
      const paymentMethodId = 'pm_test123';

      mockStripe.paymentIntents = {
        confirm: jest.fn().mockResolvedValue({
          id: paymentIntentId,
          status: 'succeeded',
          amount: 11300,
        }),
      } as any;

      (prisma.payment.update as jest.Mock).mockResolvedValue({});
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await stripeService.confirmPayment(paymentIntentId, paymentMethodId);

      expect(result).toBe(true);
      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith(
        paymentIntentId,
        expect.objectContaining({
          payment_method: paymentMethodId,
        })
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { externalId: paymentIntentId },
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should handle payment confirmation failure', async () => {
      mockStripe.paymentIntents = {
        confirm: jest.fn().mockRejectedValue(new Error('Card declined')),
      } as any;

      await expect(
        stripeService.confirmPayment('pi_test', 'pm_test')
      ).rejects.toThrow('Payment confirmation failed');
    });
  });

  describe('refundPayment', () => {
    it('should process a full refund', async () => {
      const refundRequest = {
        paymentId: 'pi_test123',
        reason: 'requested_by_customer',
        requestedBy: 'user-123',
        businessId: 'business-123',
      };

      mockStripe.refunds = {
        create: jest.fn().mockResolvedValue({
          id: 'refund_123',
          amount: 11300,
          status: 'succeeded',
        }),
      } as any;

      (prisma.refund.create as jest.Mock).mockResolvedValue({});
      (prisma.payment.update as jest.Mock).mockResolvedValue({});

      const result = await stripeService.refundPayment(refundRequest);

      expect(result).toBe(true);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: refundRequest.paymentId,
        amount: undefined,
        reason: refundRequest.reason,
        metadata: {
          requestedBy: refundRequest.requestedBy,
          businessId: refundRequest.businessId,
        },
      });
    });

    it('should process a partial refund', async () => {
      const refundRequest = {
        paymentId: 'pi_test123',
        amount: 50,
        reason: 'requested_by_customer',
        requestedBy: 'user-123',
        businessId: 'business-123',
      };

      mockStripe.refunds = {
        create: jest.fn().mockResolvedValue({
          id: 'refund_123',
          amount: 5000,
          status: 'succeeded',
        }),
      } as any;

      (prisma.refund.create as jest.Mock).mockResolvedValue({});
      (prisma.payment.update as jest.Mock).mockResolvedValue({});

      await stripeService.refundPayment(refundRequest);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000, // Converted to cents
        })
      );
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription for Indigenous business', async () => {
      const customerId = 'cus_test123';
      const priceId = 'price_indigenous';
      const metadata = { isIndigenous: true, businessId: 'ind-123' };

      mockStripe.subscriptions = {
        create: jest.fn().mockResolvedValue({
          id: 'sub_test123',
          status: 'active',
          customer: customerId,
          current_period_start: 1234567890,
          current_period_end: 1237159890,
        }),
      } as any;

      (prisma.subscription.create as jest.Mock).mockResolvedValue({});

      const result = await stripeService.createSubscription(customerId, priceId, metadata);

      expect(result.id).toBe('sub_test123');
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: customerId,
          items: [{ price: priceId }],
          metadata: expect.objectContaining({
            isIndigenous: true,
          }),
        })
      );
    });
  });

  describe('validateAmount', () => {
    it('should validate amounts within Stripe limits', async () => {
      expect(await stripeService.validateAmount(0.5)).toBe(true);
      expect(await stripeService.validateAmount(100)).toBe(true);
      expect(await stripeService.validateAmount(999999)).toBe(true);
    });

    it('should reject invalid amounts', async () => {
      expect(await stripeService.validateAmount(0.49)).toBe(false);
      expect(await stripeService.validateAmount(1000000)).toBe(false);
      expect(await stripeService.validateAmount(-10)).toBe(false);
    });
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer', async () => {
      const email = 'test@indigenous.ca';
      const metadata = { businessId: 'bus-123' };

      mockStripe.customers = {
        create: jest.fn().mockResolvedValue({
          id: 'cus_test123',
          email,
        }),
      } as any;

      (prisma.customer.create as jest.Mock).mockResolvedValue({});

      const customerId = await stripeService.createCustomer(email, metadata);

      expect(customerId).toBe('cus_test123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email,
        metadata: expect.objectContaining({
          platform: 'indigenious',
          businessId: 'bus-123',
        }),
      });
    });
  });

  describe('getPaymentMethods', () => {
    it('should retrieve customer payment methods', async () => {
      const customerId = 'cus_test123';

      mockStripe.paymentMethods = {
        list: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'pm_1',
              type: 'card',
              card: {
                brand: 'visa',
                last4: '4242',
                exp_month: 12,
                exp_year: 2025,
              },
            },
            {
              id: 'pm_2',
              type: 'card',
              card: {
                brand: 'mastercard',
                last4: '5555',
                exp_month: 6,
                exp_year: 2024,
              },
            },
          ],
        }),
      } as any;

      const methods = await stripeService.getPaymentMethods(customerId);

      expect(methods).toHaveLength(2);
      expect(methods[0]).toEqual({
        id: 'pm_1',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
        },
        isDefault: false,
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription at period end', async () => {
      const subscriptionId = 'sub_test123';

      mockStripe.subscriptions = {
        update: jest.fn().mockResolvedValue({
          id: subscriptionId,
          status: 'active',
          cancel_at_period_end: true,
        }),
      } as any;

      (prisma.subscription.update as jest.Mock).mockResolvedValue({});

      const result = await stripeService.cancelSubscription(subscriptionId);

      expect(result).toBe(true);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        subscriptionId,
        { cancel_at_period_end: true }
      );
    });
  });
});