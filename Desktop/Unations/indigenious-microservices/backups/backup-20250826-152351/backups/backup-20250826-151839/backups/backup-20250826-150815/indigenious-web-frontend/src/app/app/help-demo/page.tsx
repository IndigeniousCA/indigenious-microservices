'use client'

import React from 'react'
import { logger } from '@/lib/monitoring/logger';
import { ContextualHelpProvider, HelpButton } from '@/features/context-help/components'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { Search, Filter, Building2, FileText, Users } from 'lucide-react'

export default function HelpDemoPage() {
  return (
    <ContextualHelpProvider
      userId="demo-user"
      userType="indigenous_business"
      userExperience="beginner"
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <GlassPanel className="p-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Context-Aware Help System Demo
            </h1>
            <p className="text-white/60">
              Experience intelligent help that understands what you're trying to do
            </p>
          </GlassPanel>

          {/* Demo Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* RFQ Search Section */}
            <GlassPanel className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-400" />
                Find RFQs
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Search Keywords
                  </label>
                  <GlassInput 
                    placeholder="e.g., construction, IT services"
                    data-help="Enter keywords to search for relevant RFQs"
                    data-help-id="rfq-search"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Location
                  </label>
                  <GlassInput 
                    placeholder="Province or city"
                    data-help="Filter RFQs by location"
                    data-help-id="location-filter"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Indigenous Content %
                  </label>
                  <GlassInput 
                    type="number"
                    placeholder="Minimum percentage"
                    data-help="Filter by minimum Indigenous content requirement"
                    data-help-id="indigenous-filter"
                    className="required"
                  />
                </div>
                
                <GlassButton className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  Search RFQs
                </GlassButton>
              </div>
            </GlassPanel>

            {/* Partner Matching */}
            <GlassPanel className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-green-400" />
                Find Partners
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Required Capabilities
                  </label>
                  <GlassInput 
                    placeholder="e.g., engineering, environmental"
                    data-help="Enter capabilities you need in a partner"
                    data-help-id="partner-capabilities"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Partnership Type
                  </label>
                  <select 
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    data-help="Choose the type of partnership arrangement"
                    data-help-id="partnership-type"
                  >
                    <option>Joint Venture</option>
                    <option>Subcontractor</option>
                    <option>Consortium</option>
                  </select>
                </div>
                
                <GlassButton variant="secondary" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Find Partners
                </GlassButton>
              </div>
            </GlassPanel>

            {/* Business Profile */}
            <GlassPanel className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-400" />
                Your Profile
              </h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-400/50 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    Complete your profile to get better matches
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Profile Completion</span>
                    <span className="text-white">65%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[65%] bg-gradient-to-r from-blue-500 to-purple-500" />
                  </div>
                </div>
                
                <GlassButton variant="secondary" className="w-full">
                  Complete Profile
                </GlassButton>
              </div>
            </GlassPanel>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Intelligent Tooltips
              </h3>
              <p className="text-white/60 mb-4">
                Hover over any form field to see context-aware help
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• Smart content based on what you're doing</li>
                <li>• Remembers your preferences</li>
                <li>• Learns from your behavior</li>
              </ul>
            </GlassPanel>

            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Guided Tours
              </h3>
              <p className="text-white/60 mb-4">
                Step-by-step guidance through complex workflows
              </p>
              <GlassButton 
                size="sm"
                onClick={() => {
                  // This would normally use the context
                  logger.info('Start tour')
                }}
              >
                Start Platform Tour
              </GlassButton>
            </GlassPanel>
          </div>

          {/* Instructions */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Try These Features:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/80">
              <div>
                <h4 className="font-medium text-white mb-2">🎯 Smart Suggestions</h4>
                <p className="text-sm">
                  Look for proactive tips in the bottom right. The AI suggests next steps based on your actions.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">💬 Help Assistant</h4>
                <p className="text-sm">
                  Click the help button to chat with our AI assistant. It understands your context.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">🎓 Guided Tours</h4>
                <p className="text-sm">
                  New users automatically get tours. Experienced users see advanced features.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">💡 Context Awareness</h4>
                <p className="text-sm">
                  Help content changes based on your user type, experience level, and current task.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Help Button */}
        <HelpButton />
      </div>
    </ContextualHelpProvider>
  )
}