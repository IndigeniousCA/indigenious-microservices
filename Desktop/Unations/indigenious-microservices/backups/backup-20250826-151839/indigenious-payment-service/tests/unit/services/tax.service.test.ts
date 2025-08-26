import { TaxService } from '../../../src/services/tax.service';
import { prisma } from '../../../src/config/database';
import { redis } from '../../../src/config/redis';
import Decimal from 'decimal.js';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/utils/logger');

describe('TaxService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTax', () => {
    describe('HST Provinces', () => {
      it('should calculate 13% HST for Ontario', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'ON');

        expect(result.subtotal).toBe(100);
        expect(result.hstAmount).toBe(13);
        expect(result.gstAmount).toBe(0);
        expect(result.pstAmount).toBe(0);
        expect(result.totalTax).toBe(13);
        expect(result.total).toBe(113);
        expect(result.isExempt).toBe(false);
      });

      it('should calculate 15% HST for Nova Scotia', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'NS');

        expect(result.hstAmount).toBe(15);
        expect(result.totalTax).toBe(15);
        expect(result.total).toBe(115);
      });

      it('should calculate 15% HST for New Brunswick', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'NB');

        expect(result.hstAmount).toBe(15);
        expect(result.totalTax).toBe(15);
        expect(result.total).toBe(115);
      });
    });

    describe('GST + PST Provinces', () => {
      it('should calculate GST + PST for British Columbia', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'BC');

        expect(result.gstAmount).toBe(5);
        expect(result.pstAmount).toBe(7);
        expect(result.hstAmount).toBe(0);
        expect(result.totalTax).toBe(12);
        expect(result.total).toBe(112);
      });

      it('should calculate GST + PST for Manitoba', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'MB');

        expect(result.gstAmount).toBe(5);
        expect(result.pstAmount).toBe(7);
        expect(result.totalTax).toBe(12);
        expect(result.total).toBe(112);
      });

      it('should calculate Quebec taxes correctly (PST on GST+subtotal)', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'QC');

        expect(result.gstAmount).toBe(5);
        // PST in Quebec is calculated on subtotal + GST
        // PST = (100 + 5) * 0.09975 = 10.47375
        expect(result.pstAmount).toBeCloseTo(10.47375, 2);
        expect(result.totalTax).toBeCloseTo(15.47375, 2);
        expect(result.total).toBeCloseTo(115.47375, 2);
      });
    });

    describe('GST-only Provinces/Territories', () => {
      it('should calculate GST only for Alberta', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'AB');

        expect(result.gstAmount).toBe(5);
        expect(result.pstAmount).toBe(0);
        expect(result.hstAmount).toBe(0);
        expect(result.totalTax).toBe(5);
        expect(result.total).toBe(105);
      });

      it('should calculate GST only for Northwest Territories', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'NT');

        expect(result.gstAmount).toBe(5);
        expect(result.totalTax).toBe(5);
        expect(result.total).toBe(105);
      });

      it('should calculate GST only for Yukon', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'YT');

        expect(result.gstAmount).toBe(5);
        expect(result.totalTax).toBe(5);
        expect(result.total).toBe(105);
      });
    });

    describe('Indigenous Tax Exemptions', () => {
      it('should apply tax exemption for Indigenous business', async () => {
        const businessId = 'indigenous-123';
        
        (prisma.business.findUnique as jest.Mock).mockResolvedValue({
          id: businessId,
          isIndigenous: true,
          taxExemptStatus: 'APPROVED',
          bandNumber: '123',
        });
        (redis.get as jest.Mock).mockResolvedValue(null);
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'ON', businessId, true);

        expect(result.subtotal).toBe(100);
        expect(result.totalTax).toBe(0);
        expect(result.total).toBe(100);
        expect(result.isExempt).toBe(true);
        expect(result.exemptionReason).toBe('Approved tax exempt status');
      });

      it('should apply exemption for on-reserve delivery', async () => {
        const businessId = 'reserve-business';
        
        (prisma.business.findUnique as jest.Mock).mockResolvedValue({
          id: businessId,
          isIndigenous: true,
          isOnReserve: true,
        });
        (redis.get as jest.Mock).mockResolvedValue(null);
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'BC', businessId);

        expect(result.isExempt).toBe(true);
        expect(result.exemptionReason).toBe('On-reserve delivery');
        expect(result.totalTax).toBe(0);
      });

      it('should apply exemption with valid tax exempt certificate', async () => {
        const businessId = 'exempt-cert';
        
        (prisma.business.findUnique as jest.Mock).mockResolvedValue({
          id: businessId,
          isIndigenous: true,
          bandNumber: '456',
          taxExemptNumber: 'EXEMPT-12345',
        });
        (redis.get as jest.Mock).mockResolvedValue(null);
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'SK', businessId);

        expect(result.isExempt).toBe(true);
        expect(result.exemptionReason).toContain('Valid tax exempt certificate');
        expect(result.totalTax).toBe(0);
      });

      it('should not exempt non-Indigenous businesses', async () => {
        const businessId = 'regular-business';
        
        (prisma.business.findUnique as jest.Mock).mockResolvedValue({
          id: businessId,
          isIndigenous: false,
        });
        (redis.get as jest.Mock).mockResolvedValue(null);
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'ON', businessId, false);

        expect(result.isExempt).toBe(false);
        expect(result.totalTax).toBe(13);
      });
    });

    describe('Caching', () => {
      it('should cache tax calculations', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        await TaxService.calculateTax(100, 'ON');

        expect(redis.setex).toHaveBeenCalledWith(
          expect.stringContaining('tax:ON:100'),
          3600,
          expect.any(String)
        );
      });

      it('should cache exemption status', async () => {
        const businessId = 'cached-business';
        
        (prisma.business.findUnique as jest.Mock).mockResolvedValue({
          id: businessId,
          isIndigenous: true,
          taxExemptStatus: 'APPROVED',
        });
        (redis.get as jest.Mock).mockResolvedValue(null);
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        await TaxService.checkTaxExemption(businessId, true);

        expect(redis.setex).toHaveBeenCalledWith(
          `tax:exemption:${businessId}`,
          86400,
          expect.any(String)
        );
      });

      it('should use cached exemption status', async () => {
        const businessId = 'cached-business';
        const cachedExemption = JSON.stringify({
          isExempt: true,
          reason: 'Cached exemption',
        });
        
        (redis.get as jest.Mock).mockResolvedValue(cachedExemption);

        const result = await TaxService.checkTaxExemption(businessId);

        expect(result).toEqual({
          isExempt: true,
          reason: 'Cached exemption',
        });
        expect(prisma.business.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle decimal amounts correctly', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(99.99, 'ON');

        expect(result.subtotal).toBe(99.99);
        expect(result.hstAmount).toBeCloseTo(12.9987, 2);
        expect(result.total).toBeCloseTo(112.9887, 2);
      });

      it('should handle very large amounts', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(1000000, 'ON');

        expect(result.hstAmount).toBe(130000);
        expect(result.total).toBe(1130000);
      });

      it('should default to Ontario rates for unknown provinces', async () => {
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        const result = await TaxService.calculateTax(100, 'XX');

        expect(result.hstAmount).toBe(13); // Ontario default
        expect(result.total).toBe(113);
      });

      it('should handle errors gracefully', async () => {
        (redis.setex as jest.Mock).mockRejectedValue(new Error('Redis error'));

        const result = await TaxService.calculateTax(100, 'ON');

        // Should still calculate tax even if caching fails
        expect(result.total).toBe(113);
      });
    });
  });

  describe('calculateReverseTax', () => {
    it('should extract tax from total amount (Ontario)', () => {
      const result = TaxService.calculateReverseTax(113, 'ON');

      expect(result.total).toBe(113);
      expect(result.subtotal).toBeCloseTo(100, 2);
      expect(result.hstAmount).toBeCloseTo(13, 2);
      expect(result.totalTax).toBeCloseTo(13, 2);
    });

    it('should extract GST and PST from total (British Columbia)', () => {
      const result = TaxService.calculateReverseTax(112, 'BC');

      expect(result.total).toBe(112);
      expect(result.subtotal).toBeCloseTo(100, 2);
      expect(result.gstAmount).toBeCloseTo(5, 2);
      expect(result.pstAmount).toBeCloseTo(7, 2);
      expect(result.totalTax).toBeCloseTo(12, 2);
    });

    it('should handle Quebec reverse calculation', () => {
      const result = TaxService.calculateReverseTax(115.47375, 'QC');

      expect(result.total).toBe(115.47375);
      expect(result.subtotal).toBeCloseTo(100, 2);
      expect(result.gstAmount).toBeCloseTo(5, 2);
      expect(result.pstAmount).toBeCloseTo(10.47375, 2);
    });
  });

  describe('getTaxRates', () => {
    it('should return correct rates for each province', () => {
      const ontarioRates = TaxService.getTaxRates('ON');
      expect(ontarioRates).toEqual({
        province: 'Ontario',
        gst: 0,
        pst: 0,
        hst: 0.13,
        total: 0.13,
      });

      const bcRates = TaxService.getTaxRates('BC');
      expect(bcRates).toEqual({
        province: 'British Columbia',
        gst: 0.05,
        pst: 0.07,
        hst: 0,
        total: 0.12,
      });

      const albertaRates = TaxService.getTaxRates('AB');
      expect(albertaRates).toEqual({
        province: 'Alberta',
        gst: 0.05,
        pst: 0,
        hst: 0,
        total: 0.05,
      });
    });
  });

  describe('validateTaxNumber', () => {
    it('should validate GST/HST number format', () => {
      expect(TaxService.validateTaxNumber('123456789RT0001', 'GST')).toBe(true);
      expect(TaxService.validateTaxNumber('123 456 789 RT 0001', 'GST')).toBe(true);
      expect(TaxService.validateTaxNumber('123456789', 'GST')).toBe(false);
      expect(TaxService.validateTaxNumber('ABCDEFGHIRT0001', 'GST')).toBe(false);
    });

    it('should validate PST number format', () => {
      expect(TaxService.validateTaxNumber('PST-1234-5678', 'PST')).toBe(true);
      expect(TaxService.validateTaxNumber('1234567', 'PST')).toBe(true);
      expect(TaxService.validateTaxNumber('123456789012345', 'PST')).toBe(true);
      expect(TaxService.validateTaxNumber('123456', 'PST')).toBe(false);
      expect(TaxService.validateTaxNumber('1234567890123456', 'PST')).toBe(false);
    });

    it('should validate tax exempt certificate format', () => {
      expect(TaxService.validateTaxNumber('EXEMPT-12345', 'EXEMPT')).toBe(true);
      expect(TaxService.validateTaxNumber('12345', 'EXEMPT')).toBe(true);
      expect(TaxService.validateTaxNumber('12345678901234567890', 'EXEMPT')).toBe(true);
      expect(TaxService.validateTaxNumber('1234', 'EXEMPT')).toBe(false);
      expect(TaxService.validateTaxNumber('123456789012345678901', 'EXEMPT')).toBe(false);
    });
  });

  describe('generateTaxInvoice', () => {
    it('should generate tax invoice with all details', async () => {
      const paymentId = 'payment-123';
      
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        id: paymentId,
        amount: 113,
        taxAmount: 13,
        createdAt: new Date('2024-01-01'),
        business: {
          name: 'Test Business',
          address: '123 Main St',
          taxNumber: '123456789RT0001',
          province: 'ON',
          isIndigenous: false,
        },
        businessId: 'bus-123',
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const invoice = await TaxService.generateTaxInvoice(paymentId);

      expect(invoice).toMatchObject({
        invoiceNumber: 'INV-payment-123',
        date: expect.any(Date),
        business: {
          name: 'Test Business',
          address: '123 Main St',
          taxNumber: '123456789RT0001',
        },
        subtotal: 100,
        hst: 13,
        totalTax: 13,
        total: 113,
        isExempt: false,
      });
    });

    it('should handle tax-exempt invoices', async () => {
      const paymentId = 'exempt-payment';
      
      (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
        id: paymentId,
        amount: 100,
        taxAmount: 0,
        createdAt: new Date(),
        business: {
          name: 'Indigenous Business',
          province: 'BC',
          isIndigenous: true,
          taxExemptStatus: 'APPROVED',
        },
        businessId: 'indigenous-bus',
      });
      
      (prisma.business.findUnique as jest.Mock).mockResolvedValue({
        id: 'indigenous-bus',
        isIndigenous: true,
        taxExemptStatus: 'APPROVED',
      });
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const invoice = await TaxService.generateTaxInvoice(paymentId);

      expect(invoice.totalTax).toBe(0);
      expect(invoice.isExempt).toBe(true);
      expect(invoice.exemptionReason).toBeDefined();
    });
  });
});