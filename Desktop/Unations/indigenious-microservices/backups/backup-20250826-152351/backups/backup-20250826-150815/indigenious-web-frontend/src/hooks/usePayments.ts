import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CreatePaymentIntentParams {
  amount: number;
  recipientAccountId: string;
  description: string;
  metadata?: Record<string, string>;
  quickPay?: boolean;
  useEscrow?: boolean;
}

interface CreateCheckoutSessionParams {
  type: 'subscription' | 'one_time';
  priceId?: string;
  amount?: number;
  description: string;
  recipientAccountId?: string;
  quickPay?: boolean;
  useEscrow?: boolean;
}

export function usePayments() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = async (params: CreatePaymentIntentParams) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment');
      }

      const data = await response.json();
      
      // Show fee breakdown
      if (params.quickPay || params.useEscrow) {
        const fees = [];
        if (params.quickPay) fees.push('QuickPay: 2.5%');
        if (params.useEscrow) fees.push('Escrow: 1.5%');
        toast.info(`Additional fees applied: ${fees.join(', ')}`);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPayment = async (paymentIntentId: string, paymentMethodId?: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId, paymentMethodId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm payment');
      }

      const data = await response.json();
      
      if (data.requiresAction && data.nextActionUrl) {
        // Redirect to 3D Secure or bank authorization
        window.location.href = data.nextActionUrl;
      } else if (data.status === 'succeeded') {
        toast.success('Payment successful!');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment confirmation failed';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const createCheckoutSession = async (params: CreateCheckoutSessionParams) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          successUrl: `${window.location.origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payments/cancelled`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateQuickPay = async (
    paymentIntentId: string,
    contractDetails: {
      contractId: string;
      totalValue: number;
      completionPercentage: number;
    }
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/quick-pay/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId, contractDetails }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'QuickPay request failed');
      }

      const data = await response.json();
      
      toast.success(
        `QuickPay approved! You'll receive $${(data.quickPayAmount / 100).toFixed(2)} within 24 hours`,
        { duration: 5000 }
      );

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'QuickPay failed';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const createSubscription = async (priceId: string, paymentMethodId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, paymentMethodId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create subscription');
      }

      const data = await response.json();
      
      toast.success(`Subscribed to ${data.tier} tier successfully!`);
      
      // Refresh the page to update subscription status
      router.refresh();

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Subscription failed';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelSubscription = async (
    subscriptionId: string,
    options?: {
      reason?: string;
      feedback?: string;
      immediate?: boolean;
    }
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          reason: options?.reason,
          feedback: options?.feedback,
          cancelAtPeriodEnd: !options?.immediate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      const data = await response.json();
      
      toast.success(data.message);
      
      // Refresh the page to update subscription status
      router.refresh();

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cancellation failed';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentHistory = async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.status) searchParams.set('status', params.status);
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);

      const response = await fetch(`/api/payments/history?${searchParams}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch payment history');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payments';
      toast.error(message);
      throw err;
    }
  };

  return {
    // Payment operations
    createPaymentIntent,
    confirmPayment,
    createCheckoutSession,
    initiateQuickPay,
    
    // Subscription operations
    createSubscription,
    cancelSubscription,
    
    // Data fetching
    getPaymentHistory,
    
    // State
    isProcessing,
    error,
  };
}