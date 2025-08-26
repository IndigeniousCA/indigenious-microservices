'use client'

import React, { useState } from 'react'
import { 
  Users, Building, Building2, Briefcase, Ruler, Heart, Package,
  ArrowRight, ChevronDown, Search, FileText, DollarSign, 
  CheckCircle, Award, Shield, Calendar, MessageSquare
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { UserRole } from '@/components/dashboards/DashboardRouter'

interface FlowStep {
  id: string
  label: string
  description: string
  icon: React.ElementType
  nextSteps?: string[]
}

interface UserFlow {
  role: UserRole
  label: string
  icon: React.ElementType
  color: string
  mainFlow: FlowStep[]
  goals: string[]
}

export function UserFlowMap() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('indigenous-sme')
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  
  const userFlows: Record<UserRole, UserFlow> = {
    'indigenous-sme': {
      role: 'indigenous-sme',
      label: 'Indigenous SME',
      icon: Users,
      color: 'blue',
      goals: [
        'Find government contracts',
        'Submit competitive bids',
        'Grow business revenue',
        'Access financing'
      ],
      mainFlow: [
        { id: 'register', label: 'Register Business', description: 'Create profile with Indigenous verification', icon: Users },
        { id: 'browse', label: 'Browse RFQs', description: 'Find matching opportunities', icon: Search },
        { id: 'prepare', label: 'Prepare Bid', description: 'Gather documents, pricing', icon: FileText },
        { id: 'submit', label: 'Submit Bid', description: 'Online submission portal', icon: CheckCircle },
        { id: 'track', label: 'Track Status', description: 'Monitor bid progress', icon: Award },
        { id: 'deliver', label: 'Deliver & Invoice', description: 'Execute contract, get paid', icon: DollarSign }
      ]
    },
    'government': {
      role: 'government',
      label: 'Government',
      icon: Building2,
      color: 'green',
      goals: [
        'Meet 5% Indigenous procurement target',
        'Find qualified vendors',
        'Ensure compliance',
        'Track spending'
      ],
      mainFlow: [
        { id: 'create', label: 'Create RFQ', description: 'Define requirements', icon: FileText },
        { id: 'publish', label: 'Publish', description: 'Post to Indigenous vendors', icon: Building2 },
        { id: 'receive', label: 'Receive Bids', description: 'Collect submissions', icon: FileText },
        { id: 'evaluate', label: 'Evaluate', description: 'Score and compare', icon: Award },
        { id: 'award', label: 'Award Contract', description: 'Select winning bid', icon: CheckCircle },
        { id: 'monitor', label: 'Monitor', description: 'Track performance', icon: Shield }
      ]
    },
    'council': {
      role: 'council',
      label: 'Band Council',
      icon: Building,
      color: 'purple',
      goals: [
        'Create local employment',
        'Build community infrastructure',
        'Support member businesses',
        'Preserve culture'
      ],
      mainFlow: [
        { id: 'identify', label: 'Identify Need', description: 'Community project planning', icon: Building },
        { id: 'post', label: 'Post Project', description: 'Create project RFQ', icon: FileText },
        { id: 'engage', label: 'Engage Community', description: 'Prioritize local vendors', icon: Users },
        { id: 'select', label: 'Select Vendor', description: 'Choose best fit', icon: Award },
        { id: 'oversee', label: 'Oversee', description: 'Ensure quality delivery', icon: Shield },
        { id: 'benefit', label: 'Community Benefit', description: 'Jobs, skills, revenue', icon: Heart }
      ]
    },
    'project-manager': {
      role: 'project-manager',
      label: 'Project Manager',
      icon: Briefcase,
      color: 'orange',
      goals: [
        'Deliver on time & budget',
        'Manage vendor relationships',
        'Ensure quality standards',
        'Report progress'
      ],
      mainFlow: [
        { id: 'plan', label: 'Plan Project', description: 'Define scope & timeline', icon: Briefcase },
        { id: 'vendor', label: 'Select Vendors', description: 'Evaluate capabilities', icon: Users },
        { id: 'manage', label: 'Manage Execution', description: 'Coordinate deliverables', icon: Calendar },
        { id: 'quality', label: 'Quality Control', description: 'Inspect & approve', icon: CheckCircle },
        { id: 'report', label: 'Report Status', description: 'Update stakeholders', icon: FileText },
        { id: 'close', label: 'Close Project', description: 'Final documentation', icon: Award }
      ]
    },
    'architect': {
      role: 'architect',
      label: 'Architect/Engineer',
      icon: Ruler,
      color: 'indigo',
      goals: [
        'Design culturally appropriate buildings',
        'Meet sustainability targets',
        'Win design competitions',
        'Build portfolio'
      ],
      mainFlow: [
        { id: 'discover', label: 'Find Projects', description: 'Browse design RFQs', icon: Search },
        { id: 'design', label: 'Create Design', description: 'Develop concepts', icon: Ruler },
        { id: 'cultural', label: 'Cultural Review', description: 'Elder consultation', icon: Heart },
        { id: 'submit', label: 'Submit Proposal', description: 'Present design', icon: FileText },
        { id: 'refine', label: 'Refine Design', description: 'Incorporate feedback', icon: Award },
        { id: 'deliver', label: 'Deliver Plans', description: 'Final documentation', icon: CheckCircle }
      ]
    },
    'elder': {
      role: 'elder',
      label: 'Elder/Cultural Advisor',
      icon: Heart,
      color: 'purple',
      goals: [
        'Protect sacred knowledge',
        'Guide ethical business',
        'Teach next generation',
        'Ensure cultural respect'
      ],
      mainFlow: [
        { id: 'review', label: 'Review Projects', description: 'Assess cultural impact', icon: Heart },
        { id: 'guide', label: 'Provide Guidance', description: 'Share teachings', icon: MessageSquare },
        { id: 'protect', label: 'Protect Sacred', description: 'Flag concerns', icon: Shield },
        { id: 'approve', label: 'Give Blessing', description: 'Approve aligned projects', icon: CheckCircle },
        { id: 'monitor', label: 'Monitor Progress', description: 'Ongoing oversight', icon: Calendar },
        { id: 'teach', label: 'Share Wisdom', description: 'Educate community', icon: Award }
      ]
    },
    'vendor': {
      role: 'vendor',
      label: 'Supplier/Vendor',
      icon: Package,
      color: 'teal',
      goals: [
        'Supply quality materials',
        'Build reputation',
        'Grow customer base',
        'Optimize logistics'
      ],
      mainFlow: [
        { id: 'catalog', label: 'List Products', description: 'Upload catalog', icon: Package },
        { id: 'receive', label: 'Receive Orders', description: 'Process requests', icon: FileText },
        { id: 'fulfill', label: 'Fulfill Orders', description: 'Pick, pack, ship', icon: Package },
        { id: 'track', label: 'Track Delivery', description: 'Ensure on-time', icon: Calendar },
        { id: 'invoice', label: 'Invoice', description: 'Bill customers', icon: DollarSign },
        { id: 'support', label: 'Support', description: 'Handle issues', icon: MessageSquare }
      ]
    },
    'canadian-business': {
      role: 'canadian-business',
      label: 'Canadian Business',
      icon: Building,
      color: 'yellow',
      goals: [
        'Partner with Indigenous businesses',
        'Access new markets',
        'Meet Indigenous content requirements',
        'Build relationships'
      ],
      mainFlow: [
        { id: 'verify', label: 'Verify Partnership', description: 'Prove Indigenous partnership', icon: Shield },
        { id: 'browse', label: 'Find Partners', description: 'Connect with Indigenous firms', icon: Users },
        { id: 'collaborate', label: 'Collaborate', description: 'Joint bid preparation', icon: Building },
        { id: 'submit', label: 'Submit Joint Bid', description: 'Meet content requirements', icon: FileText },
        { id: 'deliver', label: 'Co-deliver', description: 'Execute together', icon: CheckCircle },
        { id: 'share', label: 'Share Benefits', description: 'Fair revenue split', icon: DollarSign }
      ]
    },
    'indigenous-large': {
      role: 'indigenous-large',
      label: 'Indigenous Enterprise',
      icon: Building2,
      color: 'emerald',
      goals: [
        'Win major contracts',
        'Mentor smaller businesses',
        'Scale operations',
        'Lead consortiums'
      ],
      mainFlow: [
        { id: 'qualify', label: 'Pre-qualify', description: 'Major vendor status', icon: Award },
        { id: 'analyze', label: 'Market Analysis', description: 'Strategic opportunities', icon: Search },
        { id: 'partner', label: 'Form Consortiums', description: 'Lead joint ventures', icon: Users },
        { id: 'bid', label: 'Major Bids', description: 'Large-scale proposals', icon: FileText },
        { id: 'execute', label: 'Execute', description: 'Manage complex delivery', icon: Briefcase },
        { id: 'mentor', label: 'Mentor SMEs', description: 'Build ecosystem', icon: Heart }
      ]
    }
  }
  
  const selectedFlow = userFlows[selectedRole]
  
  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">User Journey Maps</h2>
        <p className="text-white/60 mb-6">
          Select a user type to see their typical journey through the Indigenious platform
        </p>
        
        {/* Role Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {Object.values(userFlows).map((flow) => {
            const Icon = flow.icon
            const isSelected = selectedRole === flow.role
            return (
              <button
                key={flow.role}
                onClick={() => setSelectedRole(flow.role)}
                className={`p-3 rounded-lg border transition-all ${
                  isSelected
                    ? `bg-${flow.color}-500/20 border-${flow.color}-400/50 text-${flow.color}-400`
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {React.createElement(Icon, { className: "w-6 h-6 mx-auto mb-1" })}
                <p className="text-sm">{flow.label}</p>
              </button>
            )
          })}
        </div>
        
        {/* Selected Flow Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goals */}
          <GlassPanel className="p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Primary Goals</h3>
            <ul className="space-y-2">
              {selectedFlow.goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`text-${selectedFlow.color}-400 mt-1`}>•</span>
                  <span className="text-sm text-white/80">{goal}</span>
                </li>
              ))}
            </ul>
          </GlassPanel>
          
          {/* Main Journey */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-3">Typical Journey</h3>
            <div className="space-y-3">
              {selectedFlow.mainFlow.map((step, index) => {
                const Icon = step.icon
                const isExpanded = expandedStep === step.id
                return (
                  <div key={step.id}>
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      className="w-full text-left"
                    >
                      <GlassPanel className={`p-4 hover:bg-white/5 transition-all ${
                        isExpanded ? `border-${selectedFlow.color}-400/50` : ''
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-${selectedFlow.color}-500/20`}>
                            {React.createElement(Icon, { className: `w-5 h-5 text-${selectedFlow.color}-400` })}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {index + 1}. {step.label}
                            </p>
                            <p className="text-sm text-white/60">{step.description}</p>
                          </div>
                          {index < selectedFlow.mainFlow.length - 1 && (
                            <ArrowRight className="w-5 h-5 text-white/20" />
                          )}
                        </div>
                      </GlassPanel>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </GlassPanel>
      
      {/* Flow Interactions */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Platform Interactions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-white/60 mb-2">Key Features Used</p>
            <ul className="space-y-1 text-sm text-white/80">
              <li>• Smart search & filtering</li>
              <li>• Document management</li>
              <li>• Secure messaging</li>
              <li>• Progress tracking</li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-2">Support Needed</p>
            <ul className="space-y-1 text-sm text-white/80">
              <li>• Onboarding tutorials</li>
              <li>• Live chat support</li>
              <li>• Video guides</li>
              <li>• Community forums</li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-2">Success Metrics</p>
            <ul className="space-y-1 text-sm text-white/80">
              <li>• Time to first success</li>
              <li>• Task completion rate</li>
              <li>• User satisfaction</li>
              <li>• Return frequency</li>
            </ul>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}