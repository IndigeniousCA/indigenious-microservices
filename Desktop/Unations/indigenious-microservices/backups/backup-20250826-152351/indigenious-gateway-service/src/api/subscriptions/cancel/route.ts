import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { StripeService } from '@/lib/payments/stripe-service';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  reason: z.string().optional(),
  feedback: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = cancelSubscriptionSchema.parse(body);

    // Verify user owns this subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*, businesses!inner(user_id)')
      .eq('stripe_subscription_id', validatedData.subscriptionId)
      .single();

    if (!subscription || subscription.businesses.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const stripeService = new StripeService();
    
    // Cancel or schedule cancellation
    const canceledSubscription = await stripeService.cancelSubscription(
      validatedData.subscriptionId
    );

    // Update database
    await supabase
      .from('subscriptions')
      .update({
        status: canceledSubscription.status,
        cancel_at_period_end: validatedData.cancelAtPeriodEnd,
        canceled_at: new Date().toISOString(),
        cancellation_reason: validatedData.reason,
        cancellation_feedback: validatedData.feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', validatedData.subscriptionId);

    // Update business subscription status
    await supabase
      .from('businesses')
      .update({
        subscription_status: validatedData.cancelAtPeriodEnd ? 'canceling' : 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.business_id);

    // Log cancellation for analytics
    await supabase.from('subscription_events').insert({
      subscription_id: validatedData.subscriptionId,
      business_id: subscription.business_id,
      event_type: 'canceled',
      reason: validatedData.reason,
      feedback: validatedData.feedback,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      subscriptionId: canceledSubscription.id,
      status: canceledSubscription.status,
      cancelAtPeriodEnd: validatedData.cancelAtPeriodEnd,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Mock: 30 days from now
      message: validatedData.cancelAtPeriodEnd 
        ? `Subscription will be canceled at the end of the billing period`
        : 'Subscription canceled immediately',
    });
  } catch (error) {
    logger.error('Subscription cancellation failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}