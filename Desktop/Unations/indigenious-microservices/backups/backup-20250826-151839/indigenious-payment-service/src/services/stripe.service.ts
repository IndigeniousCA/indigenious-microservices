import Stripe from 'stripe';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PaymentProvider, PaymentIntent, PaymentMethod, RefundRequest } from '../types/payment.types';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { validateWebhookSignature } from '../utils/webhook-validator';
import { calculateTax } from './tax.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 30000,
});

export class StripeService implements PaymentProvider {
  private readonly provider = 'stripe';

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    try {
      // Calculate tax
      const taxAmount = await calculateTax(amount, metadata?.province || 'ON');
      const totalAmount = amount + taxAmount;

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          ...metadata,
          provider: this.provider,
          originalAmount: amount.toString(),
          taxAmount: taxAmount.toString(),
          businessId: metadata?.businessId || '',
          isIndigenous: metadata?.isIndigenous || false,
        },
        automatic_payment_methods: {
          enabled: true,
        },
        capture_method: 'automatic',
      });

      // Store in database
      await prisma.payment.create({
        data: {
          externalId: intent.id,
          provider: this.provider,
          amount: totalAmount,
          currency,
          status: 'pending',
          metadata: metadata || {},
          taxAmount,
          businessId: metadata?.businessId,
        },
      });

      // Cache for quick retrieval
      await redis.setex(
        `payment:${intent.id}`,
        3600,
        JSON.stringify({
          id: intent.id,
          clientSecret: intent.client_secret,
          amount: totalAmount,
          status: intent.status,
        })
      );

      logger.info('Stripe payment intent created', {
        intentId: intent.id,
        amount: totalAmount,
        businessId: metadata?.businessId,
      });

      return {
        id: intent.id,
        clientSecret: intent.client_secret!,
        amount: totalAmount,
        currency,
        status: 'pending',
        provider: this.provider,
      };
    } catch (error) {
      logger.error('Failed to create Stripe payment intent', error);
      throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<boolean> {
    try {
      const intent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: `${process.env.APP_URL}/payments/confirm`,
      });

      // Update database
      await prisma.payment.update({
        where: { externalId: paymentIntentId },
        data: {
          status: intent.status === 'succeeded' ? 'completed' : 'processing',
          completedAt: intent.status === 'succeeded' ? new Date() : null,
        },
      });

      // Update cache
      await redis.setex(
        `payment:${paymentIntentId}`,
        3600,
        JSON.stringify({
          id: intent.id,
          status: intent.status,
          amount: intent.amount / 100,
        })
      );

      logger.info('Payment confirmed', {
        intentId: paymentIntentId,
        status: intent.status,
      });

      return intent.status === 'succeeded';
    } catch (error) {
      logger.error('Failed to confirm payment', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          ...metadata,
          provider: this.provider,
          isIndigenous: metadata?.isIndigenous || false,
        },
      });

      // Store subscription
      await prisma.subscription.create({
        data: {
          externalId: subscription.id,
          customerId,
          priceId,
          status: subscription.status,
          provider: this.provider,
          metadata: metadata || {},
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        customerId,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', error);
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // Update database
      await prisma.subscription.update({
        where: { externalId: subscriptionId },
        data: {
          status: 'canceling',
          canceledAt: new Date(),
        },
      });

      logger.info('Subscription canceled', { subscriptionId });
      return true;
    } catch (error) {
      logger.error('Failed to cancel subscription', error);
      return false;
    }
  }

  async refundPayment(refundRequest: RefundRequest): Promise<boolean> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: refundRequest.paymentId,
        amount: refundRequest.amount ? Math.round(refundRequest.amount * 100) : undefined,
        reason: refundRequest.reason as Stripe.RefundCreateParams.Reason,
        metadata: {
          requestedBy: refundRequest.requestedBy,
          businessId: refundRequest.businessId,
        },
      });

      // Store refund
      await prisma.refund.create({
        data: {
          externalId: refund.id,
          paymentId: refundRequest.paymentId,
          amount: refund.amount / 100,
          reason: refundRequest.reason,
          status: refund.status || 'pending',
          provider: this.provider,
          requestedBy: refundRequest.requestedBy,
        },
      });

      // Update payment status
      await prisma.payment.update({
        where: { externalId: refundRequest.paymentId },
        data: {
          status: 'refunded',
          refundedAt: new Date(),
        },
      });

      logger.info('Refund processed', {
        refundId: refund.id,
        paymentId: refundRequest.paymentId,
        amount: refund.amount / 100,
      });

      return refund.status === 'succeeded';
    } catch (error) {
      logger.error('Failed to process refund', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  async createCustomer(email: string, metadata?: Record<string, any>): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          ...metadata,
          platform: 'indigenious',
        },
      });

      // Store customer
      await prisma.customer.create({
        data: {
          externalId: customer.id,
          email,
          provider: this.provider,
          metadata: metadata || {},
        },
      });

      logger.info('Customer created', { customerId: customer.id, email });
      return customer.id;
    } catch (error) {
      logger.error('Failed to create customer', error);
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean> {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      logger.info('Payment method attached', { customerId, paymentMethodId });
      return true;
    } catch (error) {
      logger.error('Failed to attach payment method', error);
      return false;
    }
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        } : undefined,
        isDefault: false, // Would need to check customer's default
      }));
    } catch (error) {
      logger.error('Failed to get payment methods', error);
      return [];
    }
  }

  async validateAmount(amount: number): Promise<boolean> {
    // Stripe minimum is 50 cents in most currencies
    return amount >= 0.5 && amount <= 999999.99;
  }
}

// Webhook processing
export async function processWebhook(req: Request, res: Response) {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    // Validate signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    // Process event based on type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      
      case 'charge.refunded':
        await handleRefundUpdate(event.data.object as Stripe.Charge);
        break;
      
      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  await prisma.payment.update({
    where: { externalId: paymentIntent.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // Clear cache
  await redis.del(`payment:${paymentIntent.id}`);

  // Trigger notifications
  logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id });
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  await prisma.payment.update({
    where: { externalId: paymentIntent.id },
    data: {
      status: 'failed',
      failedAt: new Date(),
      failureReason: paymentIntent.last_payment_error?.message,
    },
  });

  logger.error('Payment failed', {
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  await prisma.subscription.upsert({
    where: { externalId: subscription.id },
    create: {
      externalId: subscription.id,
      customerId: subscription.customer as string,
      status: subscription.status,
      provider: 'stripe',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      metadata: subscription.metadata,
    },
    update: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  logger.info('Subscription updated', {
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  await prisma.subscription.update({
    where: { externalId: subscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
    },
  });

  logger.info('Subscription canceled', { subscriptionId: subscription.id });
}

async function handleRefundUpdate(charge: Stripe.Charge) {
  if (charge.refunds && charge.refunds.data.length > 0) {
    const refund = charge.refunds.data[0];
    
    await prisma.refund.update({
      where: { externalId: refund.id },
      data: {
        status: refund.status || 'succeeded',
        processedAt: new Date(),
      },
    });

    logger.info('Refund processed', {
      refundId: refund.id,
      chargeId: charge.id,
    });
  }
}

export const stripeService = new StripeService();