'use client'

import React, { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion'
import { 
  Calculator, FileSpreadsheet, Users, BarChart3, 
  CheckCircle, Plus, Building
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { BOQEditor } from '@/features/boq-management/components/BOQEditor'
import { BOQCollaboration } from '@/features/boq-management/components/BOQCollaboration'
import { BOQTemplateLibrary } from '@/features/boq-management/components/BOQTemplateLibrary'
import { BOQAnalytics } from '@/features/boq-management/components/BOQAnalytics'
import { BOQApprovalWorkflow } from '@/features/boq-management/components/BOQApprovalWorkflow'
import type { BOQ, BOQTemplate, Comment, UserRole } from '@/features/boq-management/types'
import { boqService } from '@/features/boq-management/services/BOQService'

type View = 'templates' | 'editor' | 'collaboration' | 'analytics' | 'approval'

// Mock current user
const currentUser = {
  id: 'user-1',
  name: 'Sarah Chen',
  role: 'architect' as UserRole
}

export default function BOQDemoPage() {
  const [currentView, setCurrentView] = useState<View>('templates')
  const [selectedBOQ, setSelectedBOQ] = useState<BOQ | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Handle template selection
  const handleSelectTemplate = async (template: BOQTemplate) => {
    try {
      const newBOQ = await boqService.createBOQ({
        projectId: 'demo-project-1',
        projectName: 'Indigenous Community Center',
        discipline: template.discipline,
        createdBy: currentUser.id,
        createdByRole: currentUser.role,
        organization: 'First Nations Construction Alliance',
        projectType: template.projectType,
        indigenousContentTarget: 25,
        templateId: template.id
      })
      
      setSelectedBOQ(newBOQ)
      setCurrentView('editor')
    } catch (error) {
      logger.error('Failed to create BOQ:', error)
    }
  }

  // Handle BOQ save
  const handleSaveBOQ = (boq: BOQ) => {
    setSelectedBOQ(boq)
  }

  // Handle comment
  const handleComment = (comment: Omit<Comment, 'id' | 'timestamp'>) => {
    logger.info('New comment:', comment)
  }

  // Handle approval
  const handleApprove = (comments?: string) => {
    logger.info('BOQ approved:', comments)
  }

  // Handle rejection
  const handleReject = (comments: string) => {
    logger.info('BOQ rejected:', comments)
  }

  // Handle workflow approval
  const handleWorkflowApprove = (stepId: string, comments?: string) => {
    logger.info('Workflow step approved:', { stepId, comments })
  }

  // Handle workflow rejection
  const handleWorkflowReject = (stepId: string, comments: string) => {
    logger.info('Workflow step rejected:', { stepId, comments })
  }

  // Handle reassignment
  const handleReassign = (stepId: string, newAssignee: string) => {
    logger.info('Step reassigned:', { stepId, newAssignee })
  }

  // Render navigation
  const renderNavigation = () => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">
          Construction BOQ Collaboration System
        </h1>
        
        {selectedBOQ && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Current BOQ:</span>
            <span className="text-sm font-semibold text-white">
              {selectedBOQ.projectName}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <GlassButton
          variant={currentView === 'templates' ? 'primary' : 'secondary'}
          onClick={() => setCurrentView('templates')}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Templates
        </GlassButton>
        
        <GlassButton
          variant={currentView === 'editor' ? 'primary' : 'secondary'}
          onClick={() => setCurrentView('editor')}
          disabled={!selectedBOQ}
        >
          <Calculator className="w-4 h-4 mr-2" />
          BOQ Editor
        </GlassButton>
        
        <GlassButton
          variant={currentView === 'collaboration' ? 'primary' : 'secondary'}
          onClick={() => setCurrentView('collaboration')}
          disabled={!selectedBOQ}
        >
          <Users className="w-4 h-4 mr-2" />
          Collaboration
        </GlassButton>
        
        <GlassButton
          variant={currentView === 'analytics' ? 'primary' : 'secondary'}
          onClick={() => setCurrentView('analytics')}
          disabled={!selectedBOQ}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </GlassButton>
        
        <GlassButton
          variant={currentView === 'approval' ? 'primary' : 'secondary'}
          onClick={() => setCurrentView('approval')}
          disabled={!selectedBOQ}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Approval
        </GlassButton>
      </div>
    </GlassPanel>
  )

  // Render content based on current view
  const renderContent = () => {
    switch (currentView) {
      case 'templates':
        return (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <BOQTemplateLibrary
              onSelectTemplate={handleSelectTemplate}
              onCreateTemplate={() => setIsCreatingNew(true)}
            />
          </motion.div>
        )
        
      case 'editor':
        return selectedBOQ ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <BOQEditor
              boqId={selectedBOQ.id}
              projectId={selectedBOQ.projectId}
              projectName={selectedBOQ.projectName}
              onSave={handleSaveBOQ}
              currentUser={currentUser}
            />
          </motion.div>
        ) : (
          <EmptyState
            message="Please select a template to start editing"
            action={() => setCurrentView('templates')}
          />
        )
        
      case 'collaboration':
        return selectedBOQ ? (
          <motion.div
            key="collaboration"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <BOQCollaboration
              boq={selectedBOQ}
              currentUser={currentUser}
              onComment={handleComment}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </motion.div>
        ) : (
          <EmptyState
            message="Please select a BOQ to view collaboration"
            action={() => setCurrentView('templates')}
          />
        )
        
      case 'analytics':
        return selectedBOQ ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <BOQAnalytics
              boq={selectedBOQ}
              onExport={(format) => logger.info('Export:', format)}
            />
          </motion.div>
        ) : (
          <EmptyState
            message="Please select a BOQ to view analytics"
            action={() => setCurrentView('templates')}
          />
        )
        
      case 'approval':
        return selectedBOQ ? (
          <motion.div
            key="approval"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <BOQApprovalWorkflow
              boq={selectedBOQ}
              currentUser={currentUser}
              onApprove={handleWorkflowApprove}
              onReject={handleWorkflowReject}
              onReassign={handleReassign}
            />
          </motion.div>
        ) : (
          <EmptyState
            message="Please select a BOQ to view approval workflow"
            action={() => setCurrentView('templates')}
          />
        )
        
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {renderNavigation()}
        {renderContent()}
        
        {/* Demo Info */}
        <GlassPanel className="p-4">
          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">
                Construction BOQ Collaboration Demo
              </h3>
              <p className="text-sm text-white/60">
                This demo showcases the digital BOQ collaboration system that eliminates 
                manual Excel calculations and enables real-time collaboration between 
                architects, engineers, project managers, and contractors.
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/50">
                <span>✓ Excel Import/Export</span>
                <span>✓ Real-time Collaboration</span>
                <span>✓ Indigenous Content Tracking</span>
                <span>✓ Approval Workflows</span>
                <span>✓ Analytics Dashboard</span>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

// Empty state component
function EmptyState({ message, action }: { message: string; action: () => void }) {
  return (
    <GlassPanel className="p-12 text-center">
      <div className="max-w-md mx-auto">
        <FileSpreadsheet className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">{message}</h3>
        <GlassButton onClick={action} className="mt-4">
          Get Started
        </GlassButton>
      </div>
    </GlassPanel>
  )
}