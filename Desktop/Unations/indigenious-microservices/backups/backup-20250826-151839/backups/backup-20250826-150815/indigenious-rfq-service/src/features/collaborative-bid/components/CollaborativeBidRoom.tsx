'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, MessageSquare, FileText, Clock, CheckCircle,
  AlertCircle, Edit3, Lock, Unlock, Video, Phone,
  Share2, Download, History, User, Circle, Send,
  Paperclip, Image, FileSpreadsheet, X, MoreVertical
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'

interface Collaborator {
  id: string
  name: string
  role: string
  company: string
  avatar?: string
  status: 'online' | 'editing' | 'idle' | 'offline'
  color: string
  cursor?: { x: number, y: number, section: string }
  lastActive: Date
}

interface Comment {
  id: string
  userId: string
  userName: string
  content: string
  sectionId: string
  timestamp: Date
  resolved: boolean
  replies: Comment[]
}

interface BidSection {
  id: string
  title: string
  content: string
  assignedTo?: string
  status: 'not-started' | 'in-progress' | 'review' | 'complete'
  lockedBy?: string
  lastModified: Date
  wordCount: number
  comments: Comment[]
}

interface Activity {
  id: string
  userId: string
  userName: string
  action: string
  timestamp: Date
  details?: string
}

export function CollaborativeBidRoom({ bidId }: { bidId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'Sarah Mitchell',
      role: 'Project Manager',
      company: 'TechNation Inc',
      status: 'online',
      color: '#3B82F6',
      lastActive: new Date()
    },
    {
      id: '2',
      name: 'James Wilson',
      role: 'Technical Lead',
      company: 'TechNation Inc',
      status: 'editing',
      color: '#10B981',
      lastActive: new Date()
    },
    {
      id: '3',
      name: 'Emily Chen',
      role: 'Business Analyst',
      company: 'Partner Co',
      status: 'idle',
      color: '#F59E0B',
      lastActive: new Date(Date.now() - 10 * 60 * 1000)
    }
  ])
  
  const [sections, setSections] = useState<BidSection[]>([
    {
      id: 'exec-summary',
      title: 'Executive Summary',
      content: 'Our team is pleased to submit this comprehensive proposal...',
      assignedTo: '1',
      status: 'complete',
      lastModified: new Date(Date.now() - 60 * 60 * 1000),
      wordCount: 487,
      comments: []
    },
    {
      id: 'tech-approach',
      title: 'Technical Approach',
      content: 'Our solution leverages cutting-edge cloud technologies...',
      assignedTo: '2',
      status: 'in-progress',
      lockedBy: '2',
      lastModified: new Date(),
      wordCount: 1234,
      comments: []
    },
    {
      id: 'timeline',
      title: 'Project Timeline',
      content: 'Phase 1: Discovery and Planning (Weeks 1-4)...',
      assignedTo: '3',
      status: 'review',
      lastModified: new Date(Date.now() - 30 * 60 * 1000),
      wordCount: 856,
      comments: []
    },
    {
      id: 'budget',
      title: 'Budget & Pricing',
      content: '',
      status: 'not-started',
      lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000),
      wordCount: 0,
      comments: []
    }
  ])
  
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      userId: '2',
      userName: 'James Wilson',
      action: 'Started editing Technical Approach',
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: '2',
      userId: '1',
      userName: 'Sarah Mitchell',
      action: 'Completed Executive Summary',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      details: '487 words added'
    }
  ])
  
  const [selectedSection, setSelectedSection] = useState<string>('tech-approach')
  const [showComments, setShowComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [editingContent, setEditingContent] = useState<string>('')
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)
  
  const contentEditableRef = useRef<HTMLDivElement>(null)
  
  // Simulate real-time collaboration
  useEffect(() => {
    const interval = setInterval(() => {
      // Update collaborator statuses
      setCollaborators(prev => prev.map(c => ({
        ...c,
        lastActive: c.status === 'online' || c.status === 'editing' 
          ? new Date() 
          : c.lastActive
      })))
    }, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  const handleLockSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId
        ? { ...section, lockedBy: section.lockedBy ? undefined : '1' } // Current user ID
        : section
    ))
  }
  
  const handleContentChange = (sectionId: string, content: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId
        ? { 
            ...section, 
            content,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
            lastModified: new Date()
          }
        : section
    ))
    
    // Add activity
    const section = sections.find(s => s.id === sectionId)
    if (section) {
      setActivities(prev => [{
        id: Date.now().toString(),
        userId: '1',
        userName: 'You',
        action: `Updated ${section.title}`,
        timestamp: new Date(),
        details: `${content.split(/\s+/).filter(word => word.length > 0).length} words`
      }, ...prev])
    }
  }
  
  const handleAddComment = () => {
    if (!newComment.trim()) return
    
    const comment: Comment = {
      id: Date.now().toString(),
      userId: '1',
      userName: 'You',
      content: newComment,
      sectionId: selectedSection,
      timestamp: new Date(),
      resolved: false,
      replies: []
    }
    
    setSections(prev => prev.map(section => 
      section.id === selectedSection
        ? { ...section, comments: [...section.comments, comment] }
        : section
    ))
    
    setNewComment('')
  }
  
  const getStatusColor = (status: BidSection['status']) => {
    switch (status) {
      case 'complete': return 'text-green-400'
      case 'in-progress': return 'text-yellow-400'
      case 'review': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }
  
  const getStatusIcon = (status: BidSection['status']) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-4 h-4" />
      case 'in-progress': return <Edit3 className="w-4 h-4" />
      case 'review': return <Clock className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
    }
  }
  
  const currentSection = sections.find(s => s.id === selectedSection)
  
  return (
    <div className="max-w-7xl mx-auto">
      <GlassPanel className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Collaborative Bid Room
            </h2>
            <p className="text-sm text-white/60 mt-1">
              RFQ #2024-GOV-1234 • IT Infrastructure Modernization
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Collaborators */}
            <div className="flex -space-x-2">
              {collaborators.map((collab, i) => (
                <div
                  key={collab.id}
                  className="relative group"
                  style={{ zIndex: collaborators.length - i }}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold border-2 border-black"
                    style={{ backgroundColor: collab.color }}
                  >
                    {collab.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${
                    collab.status === 'online' ? 'bg-green-400' :
                    collab.status === 'editing' ? 'bg-yellow-400' :
                    collab.status === 'idle' ? 'bg-orange-400' :
                    'bg-gray-400'
                  }`} />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {collab.name} • {collab.status}
                    </div>
                  </div>
                </div>
              ))}
              <button className="w-10 h-10 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
                <Users className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVideoCallActive(!isVideoCallActive)}
                className={`p-2 rounded-lg transition-colors ${
                  isVideoCallActive 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Section List */}
          <div className="col-span-3 space-y-2">
            <h3 className="text-sm font-medium text-white/60 mb-3">Sections</h3>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedSection === section.id
                    ? 'bg-blue-500/20 border border-blue-400/50'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    {section.title}
                  </span>
                  {section.lockedBy && (
                    <Lock className="w-3 h-3 text-yellow-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs ${getStatusColor(section.status)}`}>
                      {getStatusIcon(section.status)}
                      {section.status.replace('-', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">
                    {section.wordCount} words
                  </span>
                </div>
                {section.assignedTo && (
                  <div className="mt-2 flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                      style={{ backgroundColor: collaborators.find(c => c.id === section.assignedTo)?.color }}
                    >
                      {collaborators.find(c => c.id === section.assignedTo)?.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs text-white/60">
                      {collaborators.find(c => c.id === section.assignedTo)?.name}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Editor */}
          <div className="col-span-6">
            {currentSection && (
              <GlassPanel className="p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {currentSection.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLockSection(currentSection.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        currentSection.lockedBy 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {currentSection.lockedBy ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
                      <History className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Editing Indicator */}
                {currentSection.lockedBy && currentSection.lockedBy !== '1' && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                    <p className="text-sm text-yellow-400 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      {collaborators.find(c => c.id === currentSection.lockedBy)?.name} is currently editing
                    </p>
                  </div>
                )}
                
                {/* Content Editor */}
                <div
                  ref={contentEditableRef}
                  contentEditable={!currentSection.lockedBy || currentSection.lockedBy === '1'}
                  className="min-h-[400px] p-4 bg-white/5 rounded-lg text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  onInput={(e) => handleContentChange(currentSection.id, e.currentTarget.textContent || '')}
                  suppressContentEditableWarning={true}
                >
                  {currentSection.content || 'Start typing...'}
                </div>
                
                {/* Word Count & Last Modified */}
                <div className="flex items-center justify-between mt-4 text-sm text-white/40">
                  <span>{currentSection.wordCount} words</span>
                  <span>Last modified {new Date(currentSection.lastModified).toLocaleTimeString()}</span>
                </div>
              </GlassPanel>
            )}
          </div>
          
          {/* Comments & Activity */}
          <div className="col-span-3 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowComments(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  showComments
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Comments
              </button>
              <button
                onClick={() => setShowComments(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  !showComments
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Activity
              </button>
            </div>
            
            {/* Content */}
            <GlassPanel className="p-4 h-[500px] flex flex-col">
              {showComments ? (
                <>
                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {currentSection?.comments.length === 0 ? (
                      <p className="text-center text-white/40 text-sm py-8">
                        No comments yet
                      </p>
                    ) : (
                      currentSection?.comments.map(comment => (
                        <div key={comment.id} className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                              {comment.userName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">
                                  {comment.userName}
                                </span>
                                <span className="text-xs text-white/40">
                                  {new Date(comment.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-white/80">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Comment Input */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
                      />
                      <button
                        onClick={handleAddComment}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Activity Feed */
                <div className="flex-1 overflow-y-auto space-y-3">
                  {activities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-white/60" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/80">
                          <span className="font-medium text-white">{activity.userName}</span> {activity.action}
                        </p>
                        {activity.details && (
                          <p className="text-xs text-white/60">{activity.details}</p>
                        )}
                        <p className="text-xs text-white/40 mt-1">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      </GlassPanel>
      
      {/* Video Call Overlay */}
      <AnimatePresence>
        {isVideoCallActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <GlassPanel className="p-4 w-80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-white">Team Call Active</span>
                </div>
                <button
                  onClick={() => setIsVideoCallActive(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {collaborators.filter(c => c.status === 'online').map(collab => (
                  <div
                    key={collab.id}
                    className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center"
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: collab.color }}
                    >
                      {collab.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                  Leave Call
                </button>
                <button className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}