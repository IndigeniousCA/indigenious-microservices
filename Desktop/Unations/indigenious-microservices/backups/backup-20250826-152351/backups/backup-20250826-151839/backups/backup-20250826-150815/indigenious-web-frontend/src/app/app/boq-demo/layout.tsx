import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BOQ Demo - Indigenous Procurement Platform',
  description: 'Bill of Quantities demonstration for construction and engineering projects',
}

export default function BOQDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {children}
    </div>
  )
}