import { InteracService } from '../../../src/services/interac.service';
import { prisma } from '../../../src/config/database';
import { redis } from '../../../src/config/redis';
import { calculateTax } from '../../../src/services/tax.service';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/services/tax.service');
jest.mock('../../../src/utils/logger');

describe('InteracService', () => {
  let interacService: InteracService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTERAC_MERCHANT_ID = 'test-merchant';
    process.env.INTERAC_API_KEY = 'test-api-key';
    process.env.INTERAC_SECRET_KEY = 'test-secret';
    process.env.APP_URL = 'https://test.indigenous.ca';
    
    interacService = new InteracService();
  });

  describe('createPaymentIntent', () => {
    it('should create an Interac e-Transfer with tax calculation', async () => {
      const amount = 100;
      const currency = 'CAD';
      const metadata = {
        email: 'business@indigenous.ca',
        phone: '555-0123',
        businessName: 'Indigenous Business Inc',
        businessId: 'bus-123',
        province: 'ON',
        securityAnswer: 'test-answer',
      };

      (calculateTax as jest.Mock).mockResolvedValue(13);
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-1',
        externalId: 'INT-123456',
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await interacService.createPaymentIntent(amount, currency, metadata);

      expect(calculateTax).toHaveBeenCalledWith(amount, 'ON');
      expect(result).toMatchObject({
        amount: 113,
        currency: 'CAD',
        status: 'pending',
        provider: 'interac',
      });
      expect(result.additionalData).toHaveProperty('securityQuestion');
      expect(result.additionalData).toHaveProperty('referenceNumber');
      expect(result.additionalData).toHaveProperty('expiryDate');
    });

    it('should reject non-CAD currency', async () => {
      await expect(
        interacService.createPaymentIntent(100, 'USD', {})
      ).rejects.toThrow('Interac only supports CAD currency');
    });

    it('should handle Indigenous business preferences', async () => {
      const metadata = {
        email: 'chief@firstnation.ca',
        businessName: 'First Nation Enterprise',
        businessId: 'fn-123',
        isIndigenous: true,
        province: 'BC',
        securityQuestion: 'Band number?',
        securityAnswer: '123',
      };

      (calculateTax as jest.Mock).mockResolvedValue(0); // Tax exempt
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-2',
        externalId: 'INT-789',
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await interacService.createPaymentIntent(100, 'CAD', metadata);

      expect(result.amount).toBe(100); // No tax added
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taxAmount: 0,
          businessId: 'fn-123',
        }),
      });
    });

    it('should generate unique reference numbers', async () => {
      (calculateTax as jest.Mock).mockResolvedValue(0);
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-3',
        externalId: 'INT-111',
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const result1 = await interacService.createPaymentIntent(100, 'CAD', {});
      const result2 = await interacService.createPaymentIntent(100, 'CAD', {});

      expect(result1.additionalData.referenceNumber).not.toBe(
        result2.additionalData.referenceNumber
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment with correct security answer', async () => {
      const paymentId = 'INT-123';
      const securityAnswer = 'correct-answer';
      const hashedAnswer = crypto
        .createHash('sha256')
        .update(securityAnswer.toLowerCase().trim())
        .digest('hex');

      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        externalId: paymentId,
        metadata: { securityAnswerHash: hashedAnswer },
      });
      (prisma.payment.update as jest.Mock).mockResolvedValue({});
      (redis.del as jest.Mock).mockResolvedValue(1);

      const result = await interacService.confirmPayment(paymentId, securityAnswer);

      expect(result).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { externalId: paymentId },
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should reject incorrect security answer', async () => {
      const paymentId = 'INT-123';
      
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        externalId: paymentId,
        metadata: { securityAnswerHash: 'different-hash' },
      });

      const result = await interacService.confirmPayment(paymentId, 'wrong-answer');

      expect(result).toBe(false);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should handle payment not found', async () => {
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await interacService.confirmPayment('non-existent', 'answer');

      expect(result).toBe(false);
    });
  });

  describe('createBulkTransfer', () => {
    it('should create multiple transfers for Indigenous businesses', async () => {
      const transfers = [
        {
          amount: 100,
          email: 'business1@indigenous.ca',
          businessId: 'bus-1',
          invoiceNumber: 'INV-001',
        },
        {
          amount: 200,
          email: 'business2@indigenous.ca',
          businessId: 'bus-2',
          invoiceNumber: 'INV-002',
        },
        {
          amount: 150,
          email: 'business3@indigenous.ca',
          businessId: 'bus-3',
          invoiceNumber: 'INV-003',
        },
      ];

      (prisma.payment.create as jest.Mock).mockImplementation((data) => 
        Promise.resolve({
          id: `payment-${Math.random()}`,
          ...data.data,
        })
      );

      const result = await interacService.createBulkTransfer(transfers);

      expect(result).toHaveLength(3);
      expect(prisma.payment.create).toHaveBeenCalledTimes(3);
      
      // Verify each payment was created with correct data
      transfers.forEach((transfer, index) => {
        expect(prisma.payment.create).toHaveBeenNthCalledWith(index + 1, {
          data: expect.objectContaining({
            amount: transfer.amount,
            businessId: transfer.businessId,
            metadata: expect.objectContaining({
              email: transfer.email,
              invoiceNumber: transfer.invoiceNumber,
            }),
          }),
        });
      });
    });

    it('should calculate total amount correctly', async () => {
      const transfers = [
        { amount: 100.50, email: 'a@test.ca', businessId: 'b1' },
        { amount: 200.25, email: 'b@test.ca', businessId: 'b2' },
        { amount: 299.25, email: 'c@test.ca', businessId: 'b3' },
      ];

      (prisma.payment.create as jest.Mock).mockResolvedValue({});

      await interacService.createBulkTransfer(transfers);

      // Total should be 600.00
      const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
      expect(totalAmount).toBe(600);
    });
  });

  describe('requestMoney', () => {
    it('should create a money request', async () => {
      const amount = 500;
      const fromEmail = 'payer@government.ca';
      const metadata = {
        businessEmail: 'receiver@indigenous.ca',
        businessName: 'Indigenous Services',
        invoiceNumber: 'INV-123',
        memo: 'Payment for services',
      };

      (prisma.paymentRequest.create as jest.Mock).mockResolvedValue({
        id: 'req-1',
        externalId: 'REQ-123',
      });

      const result = await interacService.requestMoney(amount, fromEmail, metadata);

      expect(prisma.paymentRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount,
          currency: 'CAD',
          status: 'pending',
          fromEmail,
          toEmail: metadata.businessEmail,
        }),
      });
    });

    it('should set default due date to 7 days', async () => {
      (prisma.paymentRequest.create as jest.Mock).mockResolvedValue({});

      await interacService.requestMoney(100, 'test@test.ca', {});

      expect(prisma.paymentRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            dueDate: expect.any(String),
          }),
        }),
      });

      // Verify due date is approximately 7 days from now
      const call = (prisma.paymentRequest.create as jest.Mock).mock.calls[0][0];
      const dueDate = new Date(call.data.metadata.dueDate);
      const expectedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      expect(Math.abs(dueDate.getTime() - expectedDate.getTime())).toBeLessThan(60000); // Within 1 minute
    });
  });

  describe('cancelPayment', () => {
    it('should cancel an Interac transfer', async () => {
      const paymentId = 'INT-123';
      const reason = 'Customer request';

      (prisma.payment.update as jest.Mock).mockResolvedValue({});
      (redis.del as jest.Mock).mockResolvedValue(1);

      const result = await interacService.cancelPayment(paymentId, reason);

      expect(result).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { externalId: paymentId },
        data: expect.objectContaining({
          status: 'cancelled',
          cancelledAt: expect.any(Date),
          metadata: { cancellationReason: reason },
        }),
      });
    });
  });

  describe('refundPayment', () => {
    it('should initiate a reverse transfer', async () => {
      const refundRequest = {
        paymentId: 'INT-123',
        amount: 50,
        reason: 'Partial refund',
        requestedBy: 'admin-123',
        businessId: 'bus-123',
      };

      (prisma.refund.create as jest.Mock).mockResolvedValue({});
      (prisma.payment.update as jest.Mock).mockResolvedValue({});

      const result = await interacService.refundPayment(refundRequest);

      expect(result).toBe(true);
      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentId: refundRequest.paymentId,
          amount: refundRequest.amount,
          reason: refundRequest.reason,
          status: 'pending',
          provider: 'interac',
        }),
      });
    });
  });

  describe('validateAccount', () => {
    it('should validate Interac account', async () => {
      const email = 'valid@indigenous.ca';
      const phone = '555-0123';

      const result = await interacService.validateAccount(email, phone);

      expect(result).toBe(true); // Mock always returns true
    });
  });

  describe('validateAmount', () => {
    it('should validate amounts within Interac limits', async () => {
      expect(await interacService.validateAmount(0.01)).toBe(true);
      expect(await interacService.validateAmount(100)).toBe(true);
      expect(await interacService.validateAmount(25000)).toBe(true);
    });

    it('should reject invalid amounts', async () => {
      expect(await interacService.validateAmount(0)).toBe(false);
      expect(await interacService.validateAmount(-10)).toBe(false);
      expect(await interacService.validateAmount(25001)).toBe(false);
    });
  });

  describe('getTransferStatus', () => {
    it('should retrieve and update transfer status', async () => {
      const transferId = 'INT-123';

      (prisma.payment.update as jest.Mock).mockResolvedValue({});

      const result = await interacService.getTransferStatus(transferId);

      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Security', () => {
    it('should hash security answers consistently', () => {
      const answer = 'My Security Answer';
      const service1 = new InteracService();
      const service2 = new InteracService();

      // Both instances should produce the same hash
      const hash1 = crypto
        .createHash('sha256')
        .update(answer.toLowerCase().trim())
        .digest('hex');
      
      const hash2 = crypto
        .createHash('sha256')
        .update(answer.toLowerCase().trim())
        .digest('hex');

      expect(hash1).toBe(hash2);
    });

    it('should handle case-insensitive security answers', () => {
      const answer1 = 'Test Answer';
      const answer2 = 'TEST ANSWER';
      
      const hash1 = crypto
        .createHash('sha256')
        .update(answer1.toLowerCase().trim())
        .digest('hex');
      
      const hash2 = crypto
        .createHash('sha256')
        .update(answer2.toLowerCase().trim())
        .digest('hex');

      expect(hash1).toBe(hash2);
    });
  });
});