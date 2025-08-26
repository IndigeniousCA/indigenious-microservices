'use client'

import React from 'react'
import { FeatureDiscoveryDashboard } from '@/features/feature-discovery/components'
import type { UserProfile } from '@/features/feature-discovery/types'

export default function FeatureDiscoveryDemoPage() {
  // Mock user profile for demo
  const demoUserProfile: UserProfile = {
    id: 'demo-user-001',
    type: 'indigenous_business',
    experience: 'intermediate',
    role: 'Business Development Manager', 
    goals: [
      'Find more RFQ opportunities',
      'Improve bid win rate',
      'Build strategic partnerships',
      'Streamline compliance processes'
    ],
    preferences: {
      showHints: true,
      gamification: true,
      emailNotifications: true,
      frequency: 'medium',
      categories: ['ai-powered', 'partnerships', 'compliance']
    }
  }

  return (
    <FeatureDiscoveryDashboard userProfile={demoUserProfile} />
  )
}