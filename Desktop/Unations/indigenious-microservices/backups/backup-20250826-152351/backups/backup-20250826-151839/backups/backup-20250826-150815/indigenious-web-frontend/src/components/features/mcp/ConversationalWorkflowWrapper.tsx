'use client';

import dynamic from 'next/dynamic';

const ConversationalWorkflow = dynamic(
  () => import('./ConversationalWorkflow'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-white">Loading AI Assistant...</div>
      </div>
    )
  }
);

export default function ConversationalWorkflowWrapper() {
  return <ConversationalWorkflow />;
}