import Decimal from 'decimal.js';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

/**
 * Canadian Tax Service
 * Handles GST/HST/PST calculations for all provinces and territories
 * Special handling for Indigenous tax exemptions
 */

export interface TaxRate {
  province: string;
  gst: number;
  pst: number;
  hst: number;
  total: number;
}

export interface TaxCalculation {
  subtotal: number;
  gstAmount: number;
  pstAmount: number;
  hstAmount: number;
  totalTax: number;
  total: number;
  isExempt: boolean;
  exemptionReason?: string;
}

// Canadian tax rates by province/territory (as of 2024)
const TAX_RATES: Record<string, TaxRate> = {
  // Provinces with HST
  ON: { province: 'Ontario', gst: 0, pst: 0, hst: 0.13, total: 0.13 },
  NB: { province: 'New Brunswick', gst: 0, pst: 0, hst: 0.15, total: 0.15 },
  NS: { province: 'Nova Scotia', gst: 0, pst: 0, hst: 0.15, total: 0.15 },
  NL: { province: 'Newfoundland and Labrador', gst: 0, pst: 0, hst: 0.15, total: 0.15 },
  PE: { province: 'Prince Edward Island', gst: 0, pst: 0, hst: 0.15, total: 0.15 },
  
  // Provinces with GST + PST
  BC: { province: 'British Columbia', gst: 0.05, pst: 0.07, hst: 0, total: 0.12 },
  SK: { province: 'Saskatchewan', gst: 0.05, pst: 0.06, hst: 0, total: 0.11 },
  MB: { province: 'Manitoba', gst: 0.05, pst: 0.07, hst: 0, total: 0.12 },
  QC: { province: 'Quebec', gst: 0.05, pst: 0.09975, hst: 0, total: 0.14975 },
  
  // Territories with GST only
  AB: { province: 'Alberta', gst: 0.05, pst: 0, hst: 0, total: 0.05 },
  NT: { province: 'Northwest Territories', gst: 0.05, pst: 0, hst: 0, total: 0.05 },
  NU: { province: 'Nunavut', gst: 0.05, pst: 0, hst: 0, total: 0.05 },
  YT: { province: 'Yukon', gst: 0.05, pst: 0, hst: 0, total: 0.05 },
};

export class TaxService {
  /**
   * Calculate tax for a given amount and province
   */
  static async calculateTax(
    amount: number,
    province: string,
    businessId?: string,
    isIndigenous?: boolean
  ): Promise<TaxCalculation> {
    try {
      // Check for tax exemption
      const exemption = await this.checkTaxExemption(businessId, isIndigenous);
      if (exemption.isExempt) {
        return {
          subtotal: amount,
          gstAmount: 0,
          pstAmount: 0,
          hstAmount: 0,
          totalTax: 0,
          total: amount,
          isExempt: true,
          exemptionReason: exemption.reason,
        };
      }

      // Get tax rates for province
      const rates = TAX_RATES[province.toUpperCase()] || TAX_RATES.ON; // Default to Ontario
      
      // Use Decimal for precise calculations
      const subtotal = new Decimal(amount);
      let gstAmount = new Decimal(0);
      let pstAmount = new Decimal(0);
      let hstAmount = new Decimal(0);

      if (rates.hst > 0) {
        // Province uses HST
        hstAmount = subtotal.mul(rates.hst);
      } else {
        // Province uses GST/PST
        if (rates.gst > 0) {
          gstAmount = subtotal.mul(rates.gst);
        }
        if (rates.pst > 0) {
          // Quebec calculates PST on subtotal + GST
          if (province.toUpperCase() === 'QC') {
            pstAmount = subtotal.plus(gstAmount).mul(rates.pst);
          } else {
            pstAmount = subtotal.mul(rates.pst);
          }
        }
      }

      const totalTax = gstAmount.plus(pstAmount).plus(hstAmount);
      const total = subtotal.plus(totalTax);

      // Cache the calculation
      const cacheKey = `tax:${province}:${amount}:${businessId || 'none'}`;
      await redis.setex(
        cacheKey,
        3600, // 1 hour
        JSON.stringify({
          subtotal: subtotal.toNumber(),
          gstAmount: gstAmount.toNumber(),
          pstAmount: pstAmount.toNumber(),
          hstAmount: hstAmount.toNumber(),
          totalTax: totalTax.toNumber(),
          total: total.toNumber(),
          isExempt: false,
        })
      );

      return {
        subtotal: subtotal.toNumber(),
        gstAmount: gstAmount.toNumber(),
        pstAmount: pstAmount.toNumber(),
        hstAmount: hstAmount.toNumber(),
        totalTax: totalTax.toNumber(),
        total: total.toNumber(),
        isExempt: false,
      };
    } catch (error) {
      logger.error('Tax calculation error', error);
      // Return simple calculation as fallback
      const fallbackRate = 0.13; // Default HST rate
      return {
        subtotal: amount,
        gstAmount: 0,
        pstAmount: 0,
        hstAmount: amount * fallbackRate,
        totalTax: amount * fallbackRate,
        total: amount * (1 + fallbackRate),
        isExempt: false,
      };
    }
  }

  /**
   * Check if business is eligible for tax exemption
   */
  static async checkTaxExemption(
    businessId?: string,
    isIndigenous?: boolean
  ): Promise<{ isExempt: boolean; reason?: string }> {
    try {
      if (!businessId) {
        return { isExempt: false };
      }

      // Check cache first
      const cacheKey = `tax:exemption:${businessId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Check business tax exemption status
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          isIndigenous: true,
          taxExemptStatus: true,
          taxExemptNumber: true,
          bandNumber: true,
          isOnReserve: true,
        },
      });

      if (!business) {
        return { isExempt: false };
      }

      let isExempt = false;
      let reason = '';

      // Check various exemption criteria
      if (business.taxExemptStatus === 'APPROVED') {
        isExempt = true;
        reason = 'Approved tax exempt status';
      } else if (business.isOnReserve) {
        // Purchases delivered to reserve are generally tax exempt
        isExempt = true;
        reason = 'On-reserve delivery';
      } else if (business.isIndigenous && business.bandNumber) {
        // Check if eligible for point-of-sale exemption
        const exemptionRules = await this.checkProvincialExemptionRules(business);
        if (exemptionRules.eligible) {
          isExempt = true;
          reason = exemptionRules.reason;
        }
      }

      // Cache the result
      const result = { isExempt, reason };
      await redis.setex(cacheKey, 86400, JSON.stringify(result)); // 24 hours

      return result;
    } catch (error) {
      logger.error('Tax exemption check error', error);
      return { isExempt: false };
    }
  }

  /**
   * Check provincial tax exemption rules for Indigenous businesses
   */
  static async checkProvincialExemptionRules(business: any): Promise<{
    eligible: boolean;
    reason: string;
  }> {
    // Each province has different rules for Indigenous tax exemptions
    // This is a simplified version - actual implementation would need
    // to check specific provincial regulations

    if (business.taxExemptNumber) {
      return {
        eligible: true,
        reason: `Valid tax exempt certificate: ${business.taxExemptNumber}`,
      };
    }

    // Check if business qualifies for automatic exemption
    if (business.isIndigenous && business.bandNumber) {
      // Some provinces allow point-of-sale exemption with status card
      return {
        eligible: true,
        reason: 'Indigenous-owned business with valid band number',
      };
    }

    return {
      eligible: false,
      reason: 'Does not meet provincial exemption criteria',
    };
  }

  /**
   * Calculate reverse tax (extract tax from total)
   */
  static calculateReverseTax(
    totalAmount: number,
    province: string
  ): TaxCalculation {
    const rates = TAX_RATES[province.toUpperCase()] || TAX_RATES.ON;
    
    // Calculate subtotal from total
    const total = new Decimal(totalAmount);
    const taxMultiplier = new Decimal(1).plus(rates.total);
    const subtotal = total.div(taxMultiplier);
    
    // Calculate tax amounts
    let gstAmount = new Decimal(0);
    let pstAmount = new Decimal(0);
    let hstAmount = new Decimal(0);

    if (rates.hst > 0) {
      hstAmount = subtotal.mul(rates.hst);
    } else {
      if (rates.gst > 0) {
        gstAmount = subtotal.mul(rates.gst);
      }
      if (rates.pst > 0) {
        if (province.toUpperCase() === 'QC') {
          // Quebec special calculation
          const gstPlusSubtotal = subtotal.plus(gstAmount);
          pstAmount = gstPlusSubtotal.mul(rates.pst);
        } else {
          pstAmount = subtotal.mul(rates.pst);
        }
      }
    }

    const totalTax = gstAmount.plus(pstAmount).plus(hstAmount);

    return {
      subtotal: subtotal.toNumber(),
      gstAmount: gstAmount.toNumber(),
      pstAmount: pstAmount.toNumber(),
      hstAmount: hstAmount.toNumber(),
      totalTax: totalTax.toNumber(),
      total: totalAmount,
      isExempt: false,
    };
  }

  /**
   * Get tax rates for a province
   */
  static getTaxRates(province: string): TaxRate {
    return TAX_RATES[province.toUpperCase()] || TAX_RATES.ON;
  }

  /**
   * Get all provincial tax rates
   */
  static getAllTaxRates(): Record<string, TaxRate> {
    return TAX_RATES;
  }

  /**
   * Validate tax number format
   */
  static validateTaxNumber(taxNumber: string, type: 'GST' | 'PST' | 'EXEMPT'): boolean {
    // GST/HST number format: 123456789RT0001
    if (type === 'GST') {
      const gstPattern = /^\d{9}RT\d{4}$/;
      return gstPattern.test(taxNumber.replace(/\s/g, ''));
    }

    // PST number formats vary by province
    if (type === 'PST') {
      // Basic validation - actual format varies by province
      return taxNumber.length >= 7 && taxNumber.length <= 15;
    }

    // Tax exempt certificate formats vary
    if (type === 'EXEMPT') {
      return taxNumber.length >= 5 && taxNumber.length <= 20;
    }

    return false;
  }

  /**
   * Generate tax invoice data
   */
  static async generateTaxInvoice(paymentId: string): Promise<any> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          business: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const taxCalc = await this.calculateTax(
        payment.amount - (payment.taxAmount || 0),
        payment.business?.province || 'ON',
        payment.businessId,
        payment.business?.isIndigenous
      );

      return {
        invoiceNumber: `INV-${payment.id}`,
        date: payment.createdAt,
        business: {
          name: payment.business?.name,
          address: payment.business?.address,
          taxNumber: payment.business?.taxNumber,
        },
        items: [{
          description: 'Payment Processing',
          amount: payment.amount - (payment.taxAmount || 0),
        }],
        subtotal: taxCalc.subtotal,
        gst: taxCalc.gstAmount,
        pst: taxCalc.pstAmount,
        hst: taxCalc.hstAmount,
        totalTax: taxCalc.totalTax,
        total: taxCalc.total,
        isExempt: taxCalc.isExempt,
        exemptionReason: taxCalc.exemptionReason,
      };
    } catch (error) {
      logger.error('Failed to generate tax invoice', error);
      throw error;
    }
  }
}

// Export convenience function
export async function calculateTax(
  amount: number,
  province: string,
  businessId?: string,
  isIndigenous?: boolean
): Promise<number> {
  const calculation = await TaxService.calculateTax(amount, province, businessId, isIndigenous);
  return calculation.totalTax;
}

export default TaxService;