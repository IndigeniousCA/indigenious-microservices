import { Metadata } from 'next'
import { AIGovernanceDashboard } from '@/components/admin/AIGovernanceDashboard'

export const metadata: Metadata = {
  title: 'AI Governance | Indigenious',
  description: 'AI governance dashboard and registry for ISO 42001 preparation'
}

export default function AIGovernancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AIGovernanceDashboard />
    </div>
  )
}