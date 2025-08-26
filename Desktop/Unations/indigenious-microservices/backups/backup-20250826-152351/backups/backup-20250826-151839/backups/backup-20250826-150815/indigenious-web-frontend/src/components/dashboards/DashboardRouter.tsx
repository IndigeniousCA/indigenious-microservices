'use client'

import React from 'react'
import { BusinessDashboard } from './BusinessDashboard'
import { GovernmentDashboard } from './GovernmentDashboard'
import { CouncilDashboard } from './CouncilDashboard'
import { ProjectManagerDashboard } from './ProjectManagerDashboard'
import { ArchitectDashboard } from './ArchitectDashboard'
import { ElderDashboard } from './ElderDashboard'
import { VendorDashboard } from './VendorDashboard'
import { SmartNavigation } from '@/components/navigation/SmartNavigation'

export type UserRole = 
  | 'indigenous-sme'
  | 'indigenous-large'
  | 'canadian-business'
  | 'government'
  | 'council'
  | 'project-manager'
  | 'architect'
  | 'elder'
  | 'vendor'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

interface DashboardRouterProps {
  userRole: UserRole
  experience: ExperienceLevel
  userData?: {
    name?: string
    company?: string
    department?: string
    councilName?: string
    territory?: string
    firm?: string
  }
}

export function DashboardRouter({ userRole, experience, userData = {} }: DashboardRouterProps) {
  const renderDashboard = () => {
    switch (userRole) {
      case 'indigenous-sme':
        return <BusinessDashboard businessType="indigenous-sme" experience={experience} />
      
      case 'indigenous-large':
        return <BusinessDashboard businessType="indigenous-large" experience={experience} />
      
      case 'canadian-business':
        return <BusinessDashboard businessType="canadian" experience={experience} />
      
      case 'government':
        return <GovernmentDashboard 
          experience={experience} 
          department={userData.department || ''} 
        />
      
      case 'council':
        return <CouncilDashboard 
          experience={experience}
          councilName={userData.councilName || ''}
          territory={userData.territory || ''}
        />
      
      case 'project-manager':
        return <ProjectManagerDashboard
          experience={experience}
          name={userData.name || ''}
          company={userData.company || ''}
        />
      
      case 'architect':
        return <ArchitectDashboard
          experience={experience}
          name={userData.name || ''}
          firm={userData.firm || ''}
        />
      
      case 'elder':
        return <ElderDashboard
          experience={experience}
          name={userData.name || ''}
          community={userData.councilName || ''}
        />
      
      case 'vendor':
        return <VendorDashboard
          experience={experience}
          company={userData.company || ''}
        />
      
      default:
        return <BusinessDashboard businessType="indigenous-sme" experience={experience} />
    }
  }
  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <SmartNavigation />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderDashboard()}
        </div>
      </main>
    </div>
  )
}