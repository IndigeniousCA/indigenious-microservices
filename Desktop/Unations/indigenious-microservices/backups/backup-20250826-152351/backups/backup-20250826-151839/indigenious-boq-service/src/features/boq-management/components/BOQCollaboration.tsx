'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, MessageSquare, Send, AtSign, Paperclip,
  CheckCircle, XCircle, Clock, AlertCircle, Eye
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import type { 
  BOQ, Comment, BOQCollaborationEvent, UserRole, BOQLock 
} from '../types'

interface BOQCollaborationProps {
  boq: BOQ
  currentUser: {
    id: string
    name: string
    role: UserRole
  }
  onComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => void
  onApprove: (comments?: string) => void
  onReject: (comments: string) => void
}

interface ActiveUser {
  id: string
  name: string
  role: UserRole
  cursor?: { x: number; y: number }
  selectedItem?: string
  color: string
}

export function BOQCollaboration({ 
  boq, 
  currentUser,
  onComment,
  onApprove,
  onReject
}: BOQCollaborationProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [locks, setLocks] = useState<Map<string, BOQLock>>(new Map())
  const [comments, setComments] = useState<Comment[]>(boq.collaboration.comments)
  const [newComment, setNewComment] = useState('')
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [selectedItemForComment, setSelectedItemForComment] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState<Map<string, boolean>>(new Map())
  
  const wsRef = useRef<WebSocket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Connect to WebSocket for real-time collaboration
  useEffect(() => {
    // In production, this would connect to a real WebSocket server
    // For demo purposes, we'll simulate it
    const simulateCollaboration = () => {
      // Simulate other users
      const mockUsers: ActiveUser[] = [
        {
          id: 'user-2',
          name: 'Sarah Chen',
          role: 'architect',
          color: '#3B82F6'
        },
        {
          id: 'user-3',
          name: 'Mike Johnson',
          role: 'contractor',
          color: '#10B981'
        }
      ]
      
      setActiveUsers([
        {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          color: '#8B5CF6'
        },
        ...mockUsers
      ])
    }

    simulateCollaboration()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [currentUser])

  // Handle comment submission
  const handleSendComment = () => {
    if (!newComment.trim()) return

    const comment: Omit<Comment, 'id' | 'timestamp'> = {
      text: newComment,
      author: currentUser.name,
      authorRole: currentUser.role,
      itemId: selectedItemForComment || undefined,
      resolved: false
    }

    onComment(comment)
    setNewComment('')
    
    // Simulate adding comment locally
    setComments([...comments, {
      ...comment,
      id: Date.now().toString(),
      timestamp: new Date()
    }])
  }

  // Handle typing indicator
  const handleTyping = () => {
    setIsTyping(new Map(isTyping.set(currentUser.id, true)))
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(new Map(isTyping.set(currentUser.id, false)))
    }, 1000)
  }

  // Get approval status
  const getApprovalStatus = () => {
    const userApproval = boq.collaboration.approvals.find(
      a => a.approver === currentUser.id
    )
    return userApproval?.status || 'pending'
  }

  // Check if user can approve
  const canApprove = () => {
    return ['project_manager', 'client', 'architect', 'indigenous_liaison'].includes(
      currentUser.role
    ) && getApprovalStatus() === 'pending'
  }

  // Render active user indicator
  const renderActiveUser = (user: ActiveUser) => {
    return (
      <motion.div
        key={user.id}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
      >
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: user.color }}
        />
        <span className="text-sm text-white/80">{user.name}</span>
        <span className="text-xs text-white/50">({user.role})</span>
        {isTyping.get(user.id) && (
          <span className="text-xs text-white/50 italic">typing...</span>
        )}
      </motion.div>
    )
  }

  // Render comment thread
  const renderComment = (comment: Comment, depth = 0) => {
    return (
      <div 
        key={comment.id} 
        className={`${depth > 0 ? 'ml-8' : ''} mb-3`}
      >
        <div className="flex items-start gap-3">
          <div 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold"
          >
            {comment.author.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white text-sm">
                {comment.author}
              </span>
              <span className="text-xs text-white/50">
                {comment.authorRole}
              </span>
              <span className="text-xs text-white/40">
                {new Date(comment.timestamp).toLocaleString()}
              </span>
              {comment.resolved && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Resolved
                </span>
              )}
            </div>
            
            <p className="text-white/80 text-sm">{comment.text}</p>
            
            {comment.itemId && (
              <div className="mt-1 text-xs text-blue-400">
                Re: Item {comment.itemId}
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <button className="text-xs text-white/50 hover:text-white/80">
                Reply
              </button>
              {!comment.resolved && (
                <button className="text-xs text-white/50 hover:text-white/80">
                  Mark as resolved
                </button>
              )}
            </div>
          </div>
        </div>
        
        {comment.replies?.map(reply => renderComment(reply, depth + 1))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Active Users */}
      <GlassPanel className="p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Active Collaborators ({activeUsers.length})
        </h3>
        
        <div className="space-y-2">
          <AnimatePresence>
            {activeUsers.map(user => renderActiveUser(user))}
          </AnimatePresence>
        </div>
        
        {/* Item Locks */}
        {locks.size > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-white/60 mb-2">
              Locked Items
            </h4>
            <div className="space-y-1">
              {Array.from(locks.entries()).map(([itemId, lock]) => (
                <div key={itemId} className="text-xs text-white/50">
                  Item {itemId} locked by {lock.lockedBy}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Comments & Discussion */}
      <GlassPanel className="p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Discussion ({comments.length})
        </h3>
        
        {/* Comments List */}
        <div className="max-h-96 overflow-y-auto mb-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-white/50 text-sm text-center py-8">
              No comments yet. Start the discussion!
            </p>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>
        
        {/* Comment Input */}
        <div className="border-t border-white/20 pt-4">
          <div className="flex gap-2">
            <GlassInput
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value)
                handleTyping()
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendComment()
                }
              }}
              className="flex-1"
            />
            <GlassButton
              size="sm"
              onClick={handleSendComment}
              disabled={!newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </GlassButton>
          </div>
          
          <div className="flex gap-2 mt-2">
            <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
              <AtSign className="w-3 h-3" />
              Mention
            </button>
            <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              Attach
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Approval Status */}
      <GlassPanel className="p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Approval Status
        </h3>
        
        {/* Current Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">BOQ Status</span>
            <span className={`text-sm font-semibold ${
              boq.status === 'approved' ? 'text-green-400' :
              boq.status === 'rejected' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {boq.status.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Your Status</span>
            <span className={`text-sm font-semibold ${
              getApprovalStatus() === 'approved' ? 'text-green-400' :
              getApprovalStatus() === 'rejected' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {getApprovalStatus().toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* Approval History */}
        <div className="space-y-2 mb-4">
          {boq.collaboration.approvals.map(approval => (
            <div key={approval.id} className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{approval.approver}</span>
                <span className={`text-xs ${
                  approval.status === 'approved' ? 'text-green-400' :
                  approval.status === 'rejected' ? 'text-red-400' :
                  approval.status === 'conditional' ? 'text-yellow-400' :
                  'text-white/50'
                }`}>
                  {approval.status}
                </span>
              </div>
              {approval.comments && (
                <p className="text-xs text-white/60 mt-1">{approval.comments}</p>
              )}
              <p className="text-xs text-white/40 mt-1">
                {new Date(approval.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        
        {/* Approval Actions */}
        {canApprove() && (
          <div className="space-y-2">
            <GlassButton
              className="w-full"
              onClick={() => setShowApprovalDialog(true)}
            >
              Review & Approve
            </GlassButton>
          </div>
        )}
      </GlassPanel>

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
                  Review BOQ
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 resize-none"
                      rows={4}
                      value={approvalComments}
                      onChange={(e) => setApprovalComments(e.target.value)}
                      placeholder="Add any comments or conditions..."
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <GlassButton
                      className="flex-1"
                      onClick={() => {
                        onApprove(approvalComments)
                        setShowApprovalDialog(false)
                        setApprovalComments('')
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </GlassButton>
                    
                    <GlassButton
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        if (approvalComments) {
                          onReject(approvalComments)
                          setShowApprovalDialog(false)
                          setApprovalComments('')
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </GlassButton>
                  </div>
                  
                  <GlassButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setShowApprovalDialog(false)
                      setApprovalComments('')
                    }}
                  >
                    Cancel
                  </GlassButton>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}