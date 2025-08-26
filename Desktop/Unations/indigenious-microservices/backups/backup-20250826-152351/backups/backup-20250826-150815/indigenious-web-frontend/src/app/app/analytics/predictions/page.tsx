'use client';

import { Suspense } from 'react';
import PredictiveAnalyticsDashboard from '@/components/dashboards/analytics/PredictiveAnalyticsDashboard';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function PredictionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <GlassPanel className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <div className="text-white text-lg">Loading predictive analytics...</div>
                <div className="text-white/70 text-sm mt-2">Training ML models</div>
              </GlassPanel>
            </div>
          }
        >
          <PredictiveAnalyticsDashboard />
        </Suspense>
      </div>
    </div>
  );
}