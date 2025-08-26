'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Completely bypass SSR for this page
const ClientOnlyWrapper = dynamic(
  () => Promise.resolve(({ children }: { children: React.ReactNode }) => <>{children}</>),
  { ssr: false }
);

const AssistantPageContent = dynamic(
  () => import('./AssistantPageContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading AI Assistant...</div>
      </div>
    )
  }
);

export default function WorkflowAssistantPage() {
  return (
    <ClientOnlyWrapper>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
          <div className="animate-pulse text-white text-xl">Loading...</div>
        </div>
      }>
        <AssistantPageContent />
      </Suspense>
    </ClientOnlyWrapper>
  );
}