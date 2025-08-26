import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { createClient } from '@/utils/supabase/server';
import { QuickPayEngine } from '@/features/payment-rails/services/QuickPayEngine';
import { z } from 'zod';
import { rateLimiter } from '@/lib/security/rate-limiter';
import { auditLogger, AuditCategory, AuditSeverity, AuditResult } from '@/lib/audit';

const initiateQuickPaySchema = z.object({
  paymentIntentId: z.string(),
  contractDetails: z.object({
    contractId: z.string(),
    totalValue: z.number(),
    completionPercentage: z.number().min(0).max(100),
  }),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - stricter for payment endpoints
    const rateLimitResult = await rateLimiter.checkLimit(
      `payment:${user.id}`,
      'payment',
      request
    );

    if (!rateLimitResult.success) {
      await auditLogger.log({
        actorId: user.id,
        actorType: 'user',
        category: AuditCategory.SECURITY,
        action: 'payment.quickpay.rate_limited',
        resource: 'payment',
        severity: AuditSeverity.WARNING,
        result: AuditResult.FAILURE,
        ipAddress,
        metadata: {
          endpoint: 'quickpay_initiate',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          retryAfter: rateLimitResult.retryAfter,
        },
      });

      return NextResponse.json(
        { 
          error: 'Too many payment requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
          }
        }
      );
    }

    const body = await request.json();
    const validatedData = initiateQuickPaySchema.parse(body);

    // Get business details
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 400 }
      );
    }

    // Verify business can use QuickPay (must be verified Indigenous business)
    if (!business.indigenous_owned || business.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'QuickPay is only available for verified Indigenous businesses' },
        { status: 403 }
      );
    }

    // Get transaction details
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('stripe_payment_intent_id', validatedData.paymentIntentId)
      .single();

    if (!transaction || transaction.payer_business_id !== business.stripe_account_id) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Process QuickPay request
    const quickPayResult = await QuickPayEngine.requestPayment({
      businessId: business.id,
      amount: transaction.amount,
      contractId: validatedData.contractDetails.contractId,
      invoiceNumber: `INV-${Date.now()}`,
      supportingDocs: [],
    });

    if (quickPayResult.status !== 'pending_verification') {
      return NextResponse.json(
        { 
          error: 'QuickPay request failed',
          status: quickPayResult.status,
        },
        { status: 400 }
      );
    }

    // Create QuickPay record
    const { data: quickPayRecord } = await supabase
      .from('quick_pay_transactions')
      .insert({
        transaction_id: transaction.id,
        business_id: business.id,
        original_amount: transaction.amount,
        quick_pay_amount: quickPayResult.netAmount,
        fee_amount: quickPayResult.processingFee,
        risk_score: quickPayResult.riskScore,
        contract_id: validatedData.contractDetails.contractId,
        completion_percentage: validatedData.contractDetails.completionPercentage,
        status: 'processing',
        approval_timestamp: new Date().toISOString(),
        expected_payout_date: quickPayResult.estimatedArrival.toISOString(),
      })
      .select()
      .single();

    // Queue for processing
    await supabase.from('quick_pay_queue').insert({
      quick_pay_transaction_id: quickPayRecord.id,
      payment_intent_id: validatedData.paymentIntentId,
      recipient_account_id: transaction.recipient_business_id,
      amount: quickPayResult.netAmount,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Audit successful QuickPay initiation
    await auditLogger.log({
      actorId: user.id,
      actorType: 'user',
      category: AuditCategory.UPDATE,
      action: 'payment.quickpay.initiated',
      resource: 'payment',
      resourceId: quickPayRecord.id,
      severity: AuditSeverity.INFO,
      result: AuditResult.SUCCESS,
      ipAddress,
      metadata: {
        businessId: business.id,
        transactionId: transaction.id,
        originalAmount: transaction.amount,
        quickPayAmount: quickPayResult.netAmount,
        feeAmount: quickPayResult.processingFee,
        riskScore: quickPayResult.riskScore,
        processingTimeMs: Date.now() - startTime,
      },
    });

    return NextResponse.json({
      quickPayId: quickPayRecord.id,
      approved: true,
      originalAmount: transaction.amount,
      quickPayAmount: quickPayResult.netAmount,
      feeAmount: quickPayResult.processingFee,
      expectedPayoutDate: quickPayResult.estimatedArrival,
      savings: {
        timeReduction: '89 days', // 90 days standard - 1 day QuickPay
        message: 'Get paid in 24 hours instead of 90 days',
      },
    });
  } catch (error) {
    logger.error('QuickPay initiation failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initiate QuickPay' },
      { status: 500 }
    );
  }
}