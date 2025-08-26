import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { StripeService } from '@/lib/payments/stripe-service';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { RateLimiters } from '@/lib/middleware/rate-limit';

const checkoutSessionSchema = z.object({
  type: z.enum(['subscription', 'one_time']),
  priceId: z.string().optional(), // For subscriptions
  amount: z.number().optional(), // For one-time payments
  description: z.string(),
  recipientAccountId: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  quickPay: z.boolean().optional(),
  useEscrow: z.boolean().optional(),
});

async function checkoutHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = checkoutSessionSchema.parse(body);

    // Get user's business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, stripe_account_id, name, email')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 400 }
      );
    }

    const stripeService = new StripeService();
    
    // Build line items based on type
    const lineItems = [];
    const metadata: Record<string, string> = {
      businessId: business.id,
      businessName: business.name,
      userId: user.id,
      type: validatedData.type,
    };

    if (validatedData.type === 'subscription') {
      lineItems.push({
        price: validatedData.priceId,
        quantity: 1,
      });
    } else {
      // One-time payment with dynamic pricing
      let amount = validatedData.amount!;
      let description = validatedData.description;
      
      // Add fees to description
      const fees = [];
      if (validatedData.quickPay) {
        fees.push('QuickPay (2.5%)');
        metadata.quickPay = 'true';
      }
      if (validatedData.useEscrow) {
        fees.push('Escrow Service (1.5%)');
        metadata.useEscrow = 'true';
      }
      
      if (fees.length > 0) {
        description += ` - Includes: ${fees.join(', ')}`;
      }

      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: description,
            description: `Payment from ${business.name}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      });
    }

    // Create checkout session
    const sessionParams: any = {
      line_items: lineItems,
      mode: validatedData.type === 'subscription' ? 'subscription' : 'payment',
      success_url: validatedData.successUrl,
      cancel_url: validatedData.cancelUrl,
      customer_email: business.email,
      metadata,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
    };

    // For connected accounts (marketplace payments)
    if (validatedData.recipientAccountId && validatedData.type === 'one_time') {
      const platformFeePercent = 2.5 + 
        (validatedData.quickPay ? 2.5 : 0) + 
        (validatedData.useEscrow ? 1.5 : 0);
      
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(validatedData.amount! * (platformFeePercent / 100)),
        transfer_data: {
          destination: validatedData.recipientAccountId,
        },
      };
    }

    // Add subscription data for connected accounts
    if (validatedData.type === 'subscription' && business.stripe_account_id) {
      sessionParams.subscription_data = {
        application_fee_percent: 2.5,
      };
    }

    const session = await stripeService.createCheckoutSession(sessionParams);

    // Record pending transaction/subscription
    if (validatedData.type === 'one_time') {
      await supabase.from('pending_transactions').insert({
        checkout_session_id: session.id,
        amount: validatedData.amount,
        description: validatedData.description,
        business_id: business.id,
        recipient_account_id: validatedData.recipientAccountId,
        quick_pay: validatedData.quickPay || false,
        use_escrow: validatedData.useEscrow || false,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Checkout session creation failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Apply rate limiting for payment endpoints
export const POST = RateLimiters.payment(checkoutHandler);