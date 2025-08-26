'use client'

import { IndigenousElementalCards } from '@/components/IndigenousElementalCards'
import { IndigenousBackground } from '@/components/IndigenousBackground'

export default function HomePage() {
  return (
    <>
      <IndigenousBackground />
      <div className="min-h-screen relative z-10">
        <div className="max-w-[1400px] mx-auto px-5 py-10">
          <IndigenousElementalCards />
        </div>
      </div>
    </>
  )
}