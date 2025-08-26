import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { PaymentProvider, PaymentIntent, RefundRequest } from '../types/payment.types';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { calculateTax } from './tax.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interac e-Transfer Service for Canadian payments
 * This is critical for Indigenous businesses as many prefer Canadian payment methods
 */
export class InteracService implements PaymentProvider {
  private readonly provider = 'interac';
  private readonly apiUrl = process.env.INTERAC_API_URL || 'https://api.interac.ca/v1';
  private readonly merchantId = process.env.INTERAC_MERCHANT_ID!;
  private readonly apiKey = process.env.INTERAC_API_KEY!;
  private readonly secretKey = process.env.INTERAC_SECRET_KEY!;

  /**
   * Generate authentication token for Interac API
   */
  private generateAuthToken(): string {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${this.merchantId}:${timestamp}:${nonce}`)
      .digest('base64');

    return Buffer.from(`${this.merchantId}:${timestamp}:${nonce}:${signature}`).toString('base64');
  }

  /**
   * Create Interac e-Transfer request
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    try {
      // Interac only supports CAD
      if (currency.toUpperCase() !== 'CAD') {
        throw new Error('Interac only supports CAD currency');
      }

      // Calculate tax
      const taxAmount = await calculateTax(amount, metadata?.province || 'ON');
      const totalAmount = amount + taxAmount;

      // Generate unique reference
      const referenceNumber = `IND-${Date.now()}-${uuidv4().substring(0, 8)}`;
      const requestId = uuidv4();

      // Create Interac request
      const interacRequest = {
        requestId,
        merchantRefNum: referenceNumber,
        amount: totalAmount.toFixed(2),
        currency: 'CAD',
        contactInfo: {
          email: metadata?.email || '',
          mobile: metadata?.phone || '',
          name: metadata?.businessName || '',
        },
        securityQuestion: metadata?.securityQuestion || 'What is your business registration number?',
        securityAnswer: this.hashSecurityAnswer(metadata?.securityAnswer || metadata?.businessId || ''),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        language: metadata?.language || 'en',
        notificationPreferences: {
          email: true,
          sms: metadata?.sendSms || false,
        },
        memo: `Payment to ${metadata?.businessName || 'Indigenous Business'}`,
        invoiceNumber: metadata?.invoiceNumber,
        callbackUrl: `${process.env.APP_URL}/webhook/interac`,
      };

      // Send to Interac API (mock for now)
      const response = await this.sendInteracRequest('/transfers/send', interacRequest);

      // Store in database
      const payment = await prisma.payment.create({
        data: {
          externalId: response.transferId || requestId,
          provider: this.provider,
          amount: totalAmount,
          currency: 'CAD',
          status: 'pending',
          metadata: {
            ...metadata,
            referenceNumber,
            securityQuestion: interacRequest.securityQuestion,
            expiryDate: interacRequest.expiryDate,
          },
          taxAmount,
          businessId: metadata?.businessId,
        },
      });

      // Cache for quick retrieval
      await redis.setex(
        `payment:interac:${payment.externalId}`,
        86400, // 24 hours
        JSON.stringify({
          id: payment.externalId,
          referenceNumber,
          amount: totalAmount,
          status: 'pending',
          email: metadata?.email,
        })
      );

      logger.info('Interac e-Transfer initiated', {
        transferId: payment.externalId,
        amount: totalAmount,
        businessId: metadata?.businessId,
      });

      return {
        id: payment.externalId,
        clientSecret: referenceNumber, // Use reference number as client secret
        amount: totalAmount,
        currency: 'CAD',
        status: 'pending',
        provider: this.provider,
        additionalData: {
          securityQuestion: interacRequest.securityQuestion,
          expiryDate: interacRequest.expiryDate,
          referenceNumber,
        },
      };
    } catch (error) {
      logger.error('Failed to create Interac transfer', error);
      throw new Error(`Interac transfer creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm Interac payment (verify security answer)
   */
  async confirmPayment(paymentId: string, securityAnswer: string): Promise<boolean> {
    try {
      // Get payment from database
      const payment = await prisma.payment.findUnique({
        where: { externalId: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Verify security answer
      const hashedAnswer = this.hashSecurityAnswer(securityAnswer);
      const storedHash = payment.metadata?.securityAnswerHash;

      if (hashedAnswer !== storedHash) {
        logger.warn('Invalid security answer for Interac transfer', { paymentId });
        return false;
      }

      // Send deposit request to Interac
      const response = await this.sendInteracRequest('/transfers/deposit', {
        transferId: paymentId,
        securityAnswer: hashedAnswer,
      });

      // Update payment status
      await prisma.payment.update({
        where: { externalId: paymentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Update cache
      await redis.del(`payment:interac:${paymentId}`);

      logger.info('Interac payment confirmed', {
        paymentId,
        status: 'completed',
      });

      return true;
    } catch (error) {
      logger.error('Failed to confirm Interac payment', error);
      return false;
    }
  }

  /**
   * Cancel Interac e-Transfer
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<boolean> {
    try {
      // Send cancellation request
      const response = await this.sendInteracRequest('/transfers/cancel', {
        transferId: paymentId,
        reason: reason || 'Cancelled by user',
      });

      // Update database
      await prisma.payment.update({
        where: { externalId: paymentId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          metadata: {
            cancellationReason: reason,
          },
        },
      });

      // Clear cache
      await redis.del(`payment:interac:${paymentId}`);

      logger.info('Interac transfer cancelled', { paymentId, reason });
      return true;
    } catch (error) {
      logger.error('Failed to cancel Interac transfer', error);
      return false;
    }
  }

  /**
   * Process Interac refund (reverse transfer)
   */
  async refundPayment(refundRequest: RefundRequest): Promise<boolean> {
    try {
      // Create reverse transfer
      const reverseTransfer = await this.sendInteracRequest('/transfers/reverse', {
        originalTransferId: refundRequest.paymentId,
        amount: refundRequest.amount?.toFixed(2),
        reason: refundRequest.reason,
        requestedBy: refundRequest.requestedBy,
      });

      // Store refund
      await prisma.refund.create({
        data: {
          externalId: reverseTransfer.reverseTransferId || uuidv4(),
          paymentId: refundRequest.paymentId,
          amount: refundRequest.amount || 0,
          reason: refundRequest.reason,
          status: 'pending',
          provider: this.provider,
          requestedBy: refundRequest.requestedBy,
        },
      });

      // Update payment status
      await prisma.payment.update({
        where: { externalId: refundRequest.paymentId },
        data: {
          status: 'refunding',
          refundedAt: new Date(),
        },
      });

      logger.info('Interac refund initiated', {
        paymentId: refundRequest.paymentId,
        amount: refundRequest.amount,
      });

      return true;
    } catch (error) {
      logger.error('Failed to process Interac refund', error);
      return false;
    }
  }

  /**
   * Get Interac transfer status
   */
  async getTransferStatus(transferId: string): Promise<any> {
    try {
      const response = await this.sendInteracRequest(`/transfers/${transferId}`, null, 'GET');
      
      // Update local status
      if (response.status) {
        await prisma.payment.update({
          where: { externalId: transferId },
          data: {
            status: this.mapInteracStatus(response.status),
            metadata: {
              interacStatus: response.status,
              lastChecked: new Date().toISOString(),
            },
          },
        });
      }

      return response;
    } catch (error) {
      logger.error('Failed to get transfer status', error);
      throw error;
    }
  }

  /**
   * Bulk transfer for multiple Indigenous businesses
   */
  async createBulkTransfer(transfers: Array<{
    amount: number;
    email: string;
    businessId: string;
    invoiceNumber?: string;
  }>): Promise<any[]> {
    try {
      const bulkRequest = {
        batchId: uuidv4(),
        transfers: transfers.map(t => ({
          amount: t.amount.toFixed(2),
          contactEmail: t.email,
          referenceNumber: `BULK-${t.businessId}-${Date.now()}`,
          memo: `Payment for invoice ${t.invoiceNumber || 'N/A'}`,
        })),
        totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2),
        scheduledDate: new Date().toISOString(),
      };

      const response = await this.sendInteracRequest('/transfers/bulk', bulkRequest);

      // Store each transfer
      const payments = await Promise.all(
        transfers.map(async (transfer, index) => {
          return prisma.payment.create({
            data: {
              externalId: response.transfers?.[index]?.transferId || uuidv4(),
              provider: this.provider,
              amount: transfer.amount,
              currency: 'CAD',
              status: 'pending',
              businessId: transfer.businessId,
              metadata: {
                batchId: bulkRequest.batchId,
                email: transfer.email,
                invoiceNumber: transfer.invoiceNumber,
              },
            },
          });
        })
      );

      logger.info('Bulk Interac transfers created', {
        batchId: bulkRequest.batchId,
        count: transfers.length,
        totalAmount: bulkRequest.totalAmount,
      });

      return payments;
    } catch (error) {
      logger.error('Failed to create bulk transfers', error);
      throw error;
    }
  }

  /**
   * Request Money (for collecting payments)
   */
  async requestMoney(
    amount: number,
    fromEmail: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    try {
      const requestId = uuidv4();
      const referenceNumber = `REQ-${Date.now()}-${requestId.substring(0, 8)}`;

      const moneyRequest = {
        requestId,
        referenceNumber,
        amount: amount.toFixed(2),
        currency: 'CAD',
        requestFrom: {
          email: fromEmail,
          name: metadata?.payerName || '',
        },
        requestTo: {
          email: metadata?.businessEmail || process.env.BUSINESS_EMAIL,
          name: metadata?.businessName || 'Indigenous Business',
        },
        invoiceNumber: metadata?.invoiceNumber,
        dueDate: metadata?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        memo: metadata?.memo || `Payment request for ${metadata?.businessName}`,
        callbackUrl: `${process.env.APP_URL}/webhook/interac/request`,
      };

      const response = await this.sendInteracRequest('/requests/send', moneyRequest);

      // Store request
      await prisma.paymentRequest.create({
        data: {
          externalId: response.requestId || requestId,
          provider: this.provider,
          amount,
          currency: 'CAD',
          status: 'pending',
          fromEmail,
          toEmail: moneyRequest.requestTo.email,
          metadata: {
            ...metadata,
            referenceNumber,
            dueDate: moneyRequest.dueDate,
          },
        },
      });

      logger.info('Interac money request sent', {
        requestId,
        amount,
        fromEmail,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send money request', error);
      throw error;
    }
  }

  /**
   * Validate Interac account
   */
  async validateAccount(email: string, phone?: string): Promise<boolean> {
    try {
      const response = await this.sendInteracRequest('/accounts/validate', {
        email,
        mobile: phone,
      });

      return response.isValid === true;
    } catch (error) {
      logger.error('Failed to validate Interac account', error);
      return false;
    }
  }

  /**
   * Send request to Interac API (mock implementation)
   */
  private async sendInteracRequest(
    endpoint: string,
    data: any,
    method: string = 'POST'
  ): Promise<any> {
    try {
      // In production, this would make actual API calls to Interac
      // For now, we'll simulate the response
      
      logger.info('Interac API request', {
        endpoint,
        method,
        data: data ? { ...data, securityAnswer: '[REDACTED]' } : null,
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock responses based on endpoint
      if (endpoint.includes('/transfers/send')) {
        return {
          transferId: `INT-${Date.now()}-${uuidv4().substring(0, 8)}`,
          status: 'PENDING',
          referenceNumber: data.merchantRefNum,
          expiryDate: data.expiryDate,
        };
      }

      if (endpoint.includes('/transfers/deposit')) {
        return {
          transferId: data.transferId,
          status: 'COMPLETED',
          depositedAt: new Date().toISOString(),
        };
      }

      if (endpoint.includes('/transfers/cancel')) {
        return {
          transferId: data.transferId,
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
        };
      }

      if (endpoint.includes('/transfers/reverse')) {
        return {
          reverseTransferId: `REV-${Date.now()}-${uuidv4().substring(0, 8)}`,
          originalTransferId: data.originalTransferId,
          status: 'PENDING',
        };
      }

      if (endpoint.includes('/transfers/bulk')) {
        return {
          batchId: data.batchId,
          transfers: data.transfers.map((t: any) => ({
            transferId: `INT-${Date.now()}-${uuidv4().substring(0, 8)}`,
            status: 'PENDING',
            amount: t.amount,
          })),
        };
      }

      if (endpoint.includes('/requests/send')) {
        return {
          requestId: data.requestId,
          status: 'SENT',
          referenceNumber: data.referenceNumber,
        };
      }

      if (endpoint.includes('/accounts/validate')) {
        return {
          isValid: true,
          accountType: 'PERSONAL',
          isRegistered: true,
        };
      }

      // Default response
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Interac API request failed', error);
      throw error;
    }
  }

  /**
   * Hash security answer for storage
   */
  private hashSecurityAnswer(answer: string): string {
    return crypto
      .createHash('sha256')
      .update(answer.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * Map Interac status to internal status
   */
  private mapInteracStatus(interacStatus: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'SENT': 'processing',
      'COMPLETED': 'completed',
      'DEPOSITED': 'completed',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'failed',
      'DECLINED': 'failed',
      'REVERSED': 'refunded',
    };

    return statusMap[interacStatus] || 'unknown';
  }

  async validateAmount(amount: number): Promise<boolean> {
    // Interac limits: min $0.01, max $25,000 for personal, $25,000+ for business
    return amount >= 0.01 && amount <= 25000;
  }

  // Required interface methods (not applicable for Interac)
  async createSubscription(): Promise<any> {
    throw new Error('Subscriptions not supported for Interac');
  }

  async cancelSubscription(): Promise<boolean> {
    throw new Error('Subscriptions not supported for Interac');
  }

  async createCustomer(): Promise<string> {
    throw new Error('Customer accounts not required for Interac');
  }

  async attachPaymentMethod(): Promise<boolean> {
    throw new Error('Payment methods not applicable for Interac');
  }

  async getPaymentMethods(): Promise<any[]> {
    return [];
  }
}

// Webhook processing for Interac notifications
export async function processWebhook(req: Request, res: Response) {
  try {
    // Verify webhook signature
    const signature = req.headers['x-interac-signature'] as string;
    const timestamp = req.headers['x-interac-timestamp'] as string;
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.INTERAC_WEBHOOK_SECRET!)
      .update(`${timestamp}:${JSON.stringify(req.body)}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid Interac webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Process event based on type
    switch (event.type) {
      case 'transfer.completed':
        await handleTransferCompleted(event.data);
        break;
      
      case 'transfer.cancelled':
        await handleTransferCancelled(event.data);
        break;
      
      case 'transfer.expired':
        await handleTransferExpired(event.data);
        break;
      
      case 'request.fulfilled':
        await handleRequestFulfilled(event.data);
        break;
      
      default:
        logger.info(`Unhandled Interac webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Interac webhook processing error', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}

async function handleTransferCompleted(data: any) {
  await prisma.payment.update({
    where: { externalId: data.transferId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        completedBy: data.depositedBy,
        completionTime: data.timestamp,
      },
    },
  });

  logger.info('Interac transfer completed', { transferId: data.transferId });
}

async function handleTransferCancelled(data: any) {
  await prisma.payment.update({
    where: { externalId: data.transferId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  });

  logger.info('Interac transfer cancelled', { transferId: data.transferId });
}

async function handleTransferExpired(data: any) {
  await prisma.payment.update({
    where: { externalId: data.transferId },
    data: {
      status: 'failed',
      failedAt: new Date(),
      failureReason: 'Transfer expired',
    },
  });

  logger.info('Interac transfer expired', { transferId: data.transferId });
}

async function handleRequestFulfilled(data: any) {
  await prisma.paymentRequest.update({
    where: { externalId: data.requestId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        fulfilledBy: data.paidBy,
        transferId: data.transferId,
      },
    },
  });

  logger.info('Interac money request fulfilled', { requestId: data.requestId });
}

export const interacService = new InteracService();