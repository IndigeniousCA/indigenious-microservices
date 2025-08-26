import { OpportunityMatchingDashboard } from '@/features/opportunity-matching/components/OpportunityMatchingDashboard'

export default function OpportunityMatchingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
      <OpportunityMatchingDashboard businessId="demo-business-001" />
    </div>
  )
}