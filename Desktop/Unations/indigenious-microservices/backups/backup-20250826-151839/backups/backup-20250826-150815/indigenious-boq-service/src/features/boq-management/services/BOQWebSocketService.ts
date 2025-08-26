// BOQ WebSocket Service for Real-time Collaboration
// Handles live updates, cursor tracking, and collaborative editing

import { EventEmitter } from 'events'
import { logger } from '@/lib/monitoring/logger';
import type { 
  BOQ, BOQItem, Comment, BOQLock, BOQCollaborationEvent,
  UserRole, ApprovalStatus 
} from '../types'

interface WebSocketMessage {
  type: 'cursor' | 'selection' | 'edit' | 'comment' | 'lock' | 'unlock' | 
        'typing' | 'approval' | 'presence' | 'sync'
  userId: string
  userName: string
  userRole: UserRole
  timestamp: Date
  data: unknown
}

interface CollaboratorPresence {
  userId: string
  userName: string
  userRole: UserRole
  cursor?: { x: number; y: number }
  selectedItem?: string
  isTyping: boolean
  color: string
  lastSeen: Date
}

export class BOQWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private boqId: string | null = null
  private userId: string
  private userName: string
  private userRole: UserRole
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timer | null = null
  private collaborators = new Map<string, CollaboratorPresence>()
  private locks = new Map<string, BOQLock>()
  private pendingChanges: WebSocketMessage[] = []
  private isConnected = false

  constructor(userId: string, userName: string, userRole: UserRole) {
    super()
    this.userId = userId
    this.userName = userName
    this.userRole = userRole
  }

  // Connect to BOQ collaboration session
  async connect(boqId: string): Promise<void> {
    this.boqId = boqId
    
    return new Promise((resolve, reject) => {
      try {
        // In production, this would connect to your WebSocket server
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
        this.ws = new WebSocket(`${wsUrl}/boq/${boqId}`)
        
        this.ws.onopen = () => {
          logger.info('WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          
          // Send presence
          this.sendPresence()
          
          // Start heartbeat
          this.startHeartbeat()
          
          // Process any pending changes
          this.processPendingChanges()
          
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data))
        }
        
        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error)
          this.emit('error', error)
        }
        
        this.ws.onclose = () => {
          logger.info('WebSocket disconnected')
          this.isConnected = false
          this.stopHeartbeat()
          this.handleDisconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // Disconnect from session
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.stopHeartbeat()
    this.collaborators.clear()
    this.locks.clear()
    this.pendingChanges = []
    this.isConnected = false
  }

  // Send cursor position
  sendCursor(x: number, y: number): void {
    this.send({
      type: 'cursor',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: { x, y }
    })
  }

  // Send item selection
  sendSelection(itemId: string | null): void {
    this.send({
      type: 'selection',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: { itemId }
    })
  }

  // Send item edit
  sendEdit(itemId: string, changes: Partial<BOQItem>): void {
    this.send({
      type: 'edit',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: { itemId, changes }
    })
  }

  // Send comment
  sendComment(comment: Omit<Comment, 'id' | 'timestamp'>): void {
    this.send({
      type: 'comment',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: comment
    })
  }

  // Request item lock
  requestLock(itemId: string): void {
    this.send({
      type: 'lock',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: { itemId }
    })
  }

  // Release item lock
  releaseLock(itemId: string): void {
    this.send({
      type: 'unlock',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: { itemId }
    })
  }

  // Send typing indicator
  sendTyping(isTyping: boolean): void {
    this.send({
      type: 'typing',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: { isTyping }
    })
  }

  // Send approval
  sendApproval(status: ApprovalStatus, comments?: string): void {
    this.send({
      type: 'approval',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: { status, comments }
    })
  }

  // Get active collaborators
  getCollaborators(): CollaboratorPresence[] {
    return Array.from(this.collaborators.values())
  }

  // Get current locks
  getLocks(): Map<string, BOQLock> {
    return new Map(this.locks)
  }

  // Check if item is locked
  isItemLocked(itemId: string): boolean {
    return this.locks.has(itemId)
  }

  // Check if user has lock on item
  hasLock(itemId: string): boolean {
    const lock = this.locks.get(itemId)
    return lock?.lockedBy === this.userId
  }

  // Private methods

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message if not connected
      this.pendingChanges.push(message)
    }
  }

  private sendPresence(): void {
    this.send({
      type: 'presence',
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      timestamp: new Date(),
      data: {
        color: this.generateUserColor(),
        status: 'online'
      }
    })
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'cursor':
        this.updateCollaboratorCursor(message.userId, message.data)
        this.emit('cursor', { userId: message.userId, ...message.data })
        break
        
      case 'selection':
        this.updateCollaboratorSelection(message.userId, message.data.itemId)
        this.emit('selection', { userId: message.userId, itemId: message.data.itemId })
        break
        
      case 'edit':
        this.emit('edit', {
          userId: message.userId,
          userName: message.userName,
          ...message.data
        })
        break
        
      case 'comment':
        this.emit('comment', {
          id: `comment-${Date.now()}`,
          author: message.userName,
          authorRole: message.userRole,
          timestamp: message.timestamp,
          ...message.data
        })
        break
        
      case 'lock':
        this.locks.set(message.data.itemId, {
          itemId: message.data.itemId,
          lockedBy: message.userId,
          lockedByName: message.userName,
          lockedAt: message.timestamp
        })
        this.emit('lock', message.data)
        break
        
      case 'unlock':
        this.locks.delete(message.data.itemId)
        this.emit('unlock', message.data)
        break
        
      case 'typing':
        this.updateCollaboratorTyping(message.userId, message.data.isTyping)
        this.emit('typing', { userId: message.userId, isTyping: message.data.isTyping })
        break
        
      case 'approval':
        this.emit('approval', {
          approver: message.userId,
          approverName: message.userName,
          approverRole: message.userRole,
          ...message.data
        })
        break
        
      case 'presence':
        this.updateCollaboratorPresence(message)
        this.emit('collaborators', this.getCollaborators())
        break
        
      case 'sync':
        // Full state sync from server
        this.handleSync(message.data)
        break
    }
  }

  private updateCollaboratorPresence(message: WebSocketMessage): void {
    if (message.userId === this.userId) return
    
    this.collaborators.set(message.userId, {
      userId: message.userId,
      userName: message.userName,
      userRole: message.userRole,
      color: message.data.color,
      isTyping: false,
      lastSeen: new Date()
    })
  }

  private updateCollaboratorCursor(userId: string, cursor: { x: number; y: number }): void {
    const collaborator = this.collaborators.get(userId)
    if (collaborator) {
      collaborator.cursor = cursor
      collaborator.lastSeen = new Date()
    }
  }

  private updateCollaboratorSelection(userId: string, itemId: string | null): void {
    const collaborator = this.collaborators.get(userId)
    if (collaborator) {
      collaborator.selectedItem = itemId || undefined
      collaborator.lastSeen = new Date()
    }
  }

  private updateCollaboratorTyping(userId: string, isTyping: boolean): void {
    const collaborator = this.collaborators.get(userId)
    if (collaborator) {
      collaborator.isTyping = isTyping
      collaborator.lastSeen = new Date()
    }
  }

  private handleSync(data: unknown): void {
    // Sync collaborators
    if (data.collaborators) {
      this.collaborators.clear()
      data.collaborators.forEach((c: CollaboratorPresence) => {
        if (c.userId !== this.userId) {
          this.collaborators.set(c.userId, c)
        }
      })
      this.emit('collaborators', this.getCollaborators())
    }
    
    // Sync locks
    if (data.locks) {
      this.locks.clear()
      data.locks.forEach((lock: BOQLock) => {
        this.locks.set(lock.itemId, lock)
      })
      this.emit('locks', this.getLocks())
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleDisconnect(): void {
    this.emit('disconnect')
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        logger.info(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        
        if (this.boqId) {
          this.connect(this.boqId).catch(err => {
            logger.error('Reconnection failed:', err)
          })
        }
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
    } else {
      this.emit('reconnect_failed')
    }
  }

  private processPendingChanges(): void {
    while (this.pendingChanges.length > 0) {
      const message = this.pendingChanges.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  private generateUserColor(): string {
    const colors = [
      '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
      '#EF4444', '#EC4899', '#6366F1', '#14B8A6'
    ]
    
    // Use userId to consistently assign same color
    const index = this.userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }
}

// Singleton instance manager
class BOQWebSocketManager {
  private connections = new Map<string, BOQWebSocketService>()
  
  getConnection(
    boqId: string,
    userId: string,
    userName: string,
    userRole: UserRole
  ): BOQWebSocketService {
    const key = `${boqId}-${userId}`
    
    if (!this.connections.has(key)) {
      const service = new BOQWebSocketService(userId, userName, userRole)
      this.connections.set(key, service)
    }
    
    return this.connections.get(key)!
  }
  
  removeConnection(boqId: string, userId: string): void {
    const key = `${boqId}-${userId}`
    const connection = this.connections.get(key)
    
    if (connection) {
      connection.disconnect()
      this.connections.delete(key)
    }
  }
}

export const boqWebSocketManager = new BOQWebSocketManager()