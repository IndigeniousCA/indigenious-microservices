'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, XCircle, Clock, AlertCircle, Users,
  FileText, MessageSquare, ChevronRight, User,
  Calendar, Timer, Shield, Target
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { useToast } from '@/components/ui/use-toast'
import type { 
  BOQ, WorkflowStep, UserRole, ApprovalRecord, ApprovalStatus 
} from '../types'
import { boqService } from '../services/BOQService'

interface BOQApprovalWorkflowProps {
  boq: BOQ
  currentUser: {
    id: string
    name: string
    role: UserRole
  }
  onApprove: (stepId: string, comments?: string) => void
  onReject: (stepId: string, comments: string) => void
  onReassign: (stepId: string, newAssignee: string) => void
}

interface WorkflowStepWithStatus extends WorkflowStep {
  completedBy?: string
  completedAt?: Date
  comments?: string
}

export function BOQApprovalWorkflow({ 
  boq, 
  currentUser,
  onApprove,
  onReject,
  onReassign
}: BOQApprovalWorkflowProps) {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStepWithStatus[]>([])
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  
  const { toast } = useToast()

  // Initialize workflow steps
  React.useEffect(() => {
    const initializeWorkflow = async () => {
      try {
        // Get approvers from BOQ access list
        const approvers = boq.collaboration.access.map(access => ({
          userId: access.userId,
          role: access.userRole
        }))
        
        const steps = await boqService.createApprovalWorkflow(boq, approvers)
        
        // Merge with existing approval records
        const stepsWithStatus = steps.map(step => {
          const approvals = boq.collaboration.approvals.filter(
            approval => step.assignees.includes(approval.approver)
          )
          
          if (approvals.length > 0) {
            const latestApproval = approvals[approvals.length - 1]
            return {
              ...step,
              status: latestApproval.status === 'approved' ? 'completed' : 
                      latestApproval.status === 'rejected' ? 'rejected' : 'pending',
              completedBy: latestApproval.approver,
              completedAt: latestApproval.timestamp,
              comments: latestApproval.comments
            } as WorkflowStepWithStatus
          }
          
          return step as WorkflowStepWithStatus
        })
        
        setWorkflowSteps(stepsWithStatus)
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load approval workflow',
          variant: 'destructive'
        })
      }
    }
    
    initializeWorkflow()
  }, [boq, toast])

  // Check if user can approve current step
  const canApproveStep = (step: WorkflowStepWithStatus): boolean => {
    return step.status === 'pending' && 
           step.assignees.includes(currentUser.id) &&
           !isStepBlocked(step)
  }

  // Check if step is blocked by previous steps
  const isStepBlocked = (step: WorkflowStepWithStatus): boolean => {
    const stepIndex = workflowSteps.findIndex(s => s.id === step.id)
    if (stepIndex === 0) return false
    
    // Check if all previous steps are completed
    for (let i = 0; i < stepIndex; i++) {
      if (workflowSteps[i].status !== 'completed') {
        return true
      }
    }
    
    return false
  }

  // Get step status color
  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20'
      case 'rejected':
        return 'text-red-400 bg-red-500/20'
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20'
      default:
        return 'text-white/60 bg-white/10'
    }
  }

  // Get step icon
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" />
      case 'rejected':
        return <XCircle className="w-5 h-5" />
      case 'pending':
        return <Clock className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  // Handle approval submission
  const handleApproval = () => {
    if (!selectedStep) return
    
    if (isRejecting) {
      if (!approvalComments.trim()) {
        toast({
          title: 'Error',
          description: 'Please provide comments for rejection',
          variant: 'destructive'
        })
        return
      }
      onReject(selectedStep, approvalComments)
    } else {
      onApprove(selectedStep, approvalComments || undefined)
    }
    
    // Update local state
    setWorkflowSteps(steps => steps.map(step => {
      if (step.id === selectedStep) {
        return {
          ...step,
          status: isRejecting ? 'rejected' : 'completed',
          completedBy: currentUser.id,
          completedAt: new Date(),
          comments: approvalComments || undefined
        }
      }
      return step
    }))
    
    setShowApprovalDialog(false)
    setApprovalComments('')
    setIsRejecting(false)
    setSelectedStep(null)
    
    toast({
      title: 'Success',
      description: isRejecting ? 'BOQ rejected' : 'BOQ approved'
    })
  }

  // Calculate overall progress
  const calculateProgress = () => {
    const completed = workflowSteps.filter(s => s.status === 'completed').length
    return workflowSteps.length > 0 ? (completed / workflowSteps.length) * 100 : 0
  }

  // Render step details
  const renderStepDetails = (step: WorkflowStepWithStatus) => {
    const isBlocked = isStepBlocked(step)
    const canApprove = canApproveStep(step)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <GlassPanel className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{step.name}</h3>
              <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm ${getStepStatusColor(step.status)}`}>
                {getStepIcon(step.status)}
                <span className="capitalize">{step.status}</span>
              </div>
            </div>
            
            {canApprove && (
              <div className="flex gap-2">
                <GlassButton
                  onClick={() => {
                    setSelectedStep(step.id)
                    setIsRejecting(false)
                    setShowApprovalDialog(true)
                  }}
                >
                  Approve
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={() => {
                    setSelectedStep(step.id)
                    setIsRejecting(true)
                    setShowApprovalDialog(true)
                  }}
                >
                  Reject
                </GlassButton>
              </div>
            )}
          </div>

          {/* Assignees */}
          <div className="mb-4">
            <p className="text-sm text-white/60 mb-2">Assignees</p>
            <div className="flex flex-wrap gap-2">
              {step.assignees.map(assignee => (
                <div key={assignee} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg">
                  <User className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/80">{assignee}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status info */}
          {step.completedBy && (
            <div className="space-y-2 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Completed by</span>
                <span className="text-white">{step.completedBy}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Date</span>
                <span className="text-white">
                  {new Date(step.completedAt!).toLocaleDateString()}
                </span>
              </div>
              {step.comments && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-sm text-white/60 mb-1">Comments</p>
                  <p className="text-sm text-white">{step.comments}</p>
                </div>
              )}
            </div>
          )}

          {/* Blocked message */}
          {isBlocked && step.status === 'pending' && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-400">
                    Waiting for Previous Approvals
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    This step cannot be approved until all previous steps are completed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </GlassPanel>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Approval Workflow</h2>
            <p className="text-white/60 mt-1">
              Review and approve BOQ for {boq.projectName}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-white/60">Overall Progress</p>
            <p className="text-2xl font-bold text-white">{calculateProgress().toFixed(0)}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${calculateProgress()}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </GlassPanel>

      {/* Workflow Steps */}
      <div className="space-y-4">
        {workflowSteps.map((step, index) => (
          <div key={step.id}>
            {/* Step Card */}
            <div
              className={`relative cursor-pointer transition-all ${
                selectedStep === step.id ? 'ring-2 ring-blue-400' : ''
              }`}
              onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
            >
              <GlassPanel className="p-4">
                <div className="flex items-center gap-4">
                  {/* Step number */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    step.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Step info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{step.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {step.assignees.length} assignee{step.assignees.length !== 1 && 's'}
                      </span>
                      {step.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due {new Date(step.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className={`px-3 py-1 rounded-full text-sm ${getStepStatusColor(step.status)}`}>
                    {getStepIcon(step.status)}
                  </div>

                  {/* Expand indicator */}
                  <motion.div
                    animate={{ rotate: selectedStep === step.id ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-5 h-5 text-white/60" />
                  </motion.div>
                </div>
              </GlassPanel>

              {/* Connection line */}
              {index < workflowSteps.length - 1 && (
                <div className="absolute left-6 top-full h-4 w-0.5 bg-white/20" />
              )}
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {selectedStep === step.id && (
                <div className="mt-4 ml-14">
                  {renderStepDetails(step)}
                </div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-sm text-white/60">Avg Approval Time</p>
              <p className="text-xl font-semibold text-white">2.5 days</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-sm text-white/60">Indigenous Content</p>
              <p className="text-xl font-semibold text-white">
                {boqService.calculateIndigenousContent(boq).percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-sm text-white/60">Compliance Score</p>
              <p className="text-xl font-semibold text-white">98%</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Approval Dialog */}
      <AnimatePresence>
        {showApprovalDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <GlassPanel className="p-6 max-w-md w-full">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {isRejecting ? 'Reject BOQ' : 'Approve BOQ'}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">
                      Comments {isRejecting && '(Required)'}
                    </label>
                    <textarea
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 resize-none"
                      rows={4}
                      value={approvalComments}
                      onChange={(e) => setApprovalComments(e.target.value)}
                      placeholder={isRejecting ? "Please explain why you're rejecting this BOQ..." : "Add any comments or conditions..."}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <GlassButton
                      className="flex-1"
                      onClick={handleApproval}
                    >
                      {isRejecting ? (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </>
                      )}
                    </GlassButton>
                    
                    <GlassButton
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setShowApprovalDialog(false)
                        setApprovalComments('')
                        setIsRejecting(false)
                      }}
                    >
                      Cancel
                    </GlassButton>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}