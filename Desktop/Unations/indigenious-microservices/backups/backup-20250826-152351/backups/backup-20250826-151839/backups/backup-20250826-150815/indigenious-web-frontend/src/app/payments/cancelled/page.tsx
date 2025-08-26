'use client';

import { XCircle, RefreshCw, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassButton } from '@/components/ui/glass-button';
import { motion } from 'framer-motion';

export default function PaymentCancelledPage() {
  const router = useRouter();

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
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>

          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Your payment was cancelled. No charges have been made to your account.
          </p>

          <div className="space-y-4 mb-8">
            <GlassButton
              size="lg"
              className="w-full"
              onClick={() => router.back()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </GlassButton>

            <Link href="/dashboard">
              <GlassButton variant="secondary" className="w-full">
                Back to Dashboard
              </GlassButton>
            </Link>
          </div>

          <GlassPanel className="p-6 bg-amber-500/10 border-amber-500/20">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="font-semibold mb-1">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you're experiencing issues with payment, our support team is here to help.
                </p>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <a href="mailto:support@indigenious.ca" className="text-blue-400 hover:underline">
                      support@indigenious.ca
                    </a>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <a href="tel:1-800-NATIVE-1" className="text-blue-400 hover:underline">
                      1-800-NATIVE-1
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </GlassPanel>

          <div className="mt-8 text-sm text-muted-foreground">
            <p>Common reasons for payment cancellation:</p>
            <ul className="mt-2 space-y-1">
              <li>• Insufficient funds</li>
              <li>• Card declined by bank</li>
              <li>• Session timeout</li>
              <li>• User cancelled transaction</li>
            </ul>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}