'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Download, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassButton } from '@/components/ui/glass-button';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface SessionDetails {
  amount: number;
  description: string;
  quickPay?: boolean;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const sessionId = searchParams?.get('session_id') || null;
  const paymentIntentId = searchParams?.get('payment_intent') || null;

  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Fetch session details if available
    if (sessionId) {
      // In production, would fetch from API
      setSessionDetails({
        amount: 50000, // $500.00
        description: 'RFQ #2024-001 Payment',
        quickPay: true,
      });
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <GlassPanel className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Payment Successful!
          </h1>

          <p className="text-muted-foreground mb-8">
            Your payment has been processed successfully.
          </p>

          {sessionDetails && (
            <GlassPanel className="mb-8 p-6 bg-white/5">
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">
                    ${(sessionDetails.amount / 100).toFixed(2)} CAD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-semibold">{sessionDetails.description}</span>
                </div>
                {sessionDetails.quickPay && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">QuickPay:</span>
                    <span className="font-semibold text-green-500">
                      Funds available in 24 hours
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-mono text-sm">
                    {sessionId || paymentIntentId || 'N/A'}
                  </span>
                </div>
              </div>
            </GlassPanel>
          )}

          <div className="space-y-4">
            <GlassButton
              size="lg"
              className="w-full"
              onClick={() => router.push('/dashboard/payments')}
            >
              View Payment History
              <ArrowRight className="ml-2 h-4 w-4" />
            </GlassButton>

            <div className="flex gap-4">
              <GlassButton
                variant="secondary"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </GlassButton>

              <Link href="/dashboard" className="flex-1">
                <GlassButton variant="secondary" className="w-full">
                  Back to Dashboard
                </GlassButton>
              </Link>
            </div>
          </div>

          {sessionDetails?.quickPay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20"
            >
              <p className="text-sm text-blue-400">
                <strong>QuickPay Benefit:</strong> You're getting paid 89 days faster than standard government payment terms!
              </p>
            </motion.div>
          )}
        </GlassPanel>
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}