// Communication Hook
// Main hook for messaging and communication features

import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useDataProvider } from '../../../shared/hooks/useDataProvider'
import type { 
  Channel, 
  Message, 
  User, 
  Notification, 
  PresenceStatus,
  MessageType,
  ChannelType
} from '../types/communication.types'

interface WebSocketMessage {
  type: string
  data: unknown
  timestamp: string
}

export function useCommunication(userId: string) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [typingUsers, setTypingUsers] = useState<User[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dataProvider = useDataProvider()

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      // In production, this would use wss:// and proper authentication
      const wsUrl = `ws://localhost:8080/ws?userId=${userId}`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        logger.info('WebSocket connected')
        setConnectionStatus('connected')
        
        // Send authentication message
        const authMessage: WebSocketMessage = {
          type: 'auth',
          data: { userId, token: 'mock-jwt-token' },
          timestamp: new Date().toISOString()
        }
        wsRef.current?.send(JSON.stringify(authMessage))

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'ping',
              data: {},
              timestamp: new Date().toISOString()
            }))
          }
        }, 30000) // 30 seconds
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        logger.info('WebSocket disconnected')
        setConnectionStatus('disconnected')
        
        // Clear heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (userId) {
            connectWebSocket()
          }
        }, 3000)
      }

      wsRef.current.onerror = (error) => {
        logger.error('WebSocket error:', error)
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      logger.error('Failed to connect WebSocket:', error)
      setConnectionStatus('disconnected')
    }
  }, [userId])

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'message':
        handleNewMessage(message.data)
        break
      case 'typing_start':
        handleTypingStart(message.data)
        break
      case 'typing_stop':
        handleTypingStop(message.data)
        break
      case 'presence_update':
        handlePresenceUpdate(message.data)
        break
      case 'channel_update':
        handleChannelUpdate(message.data)
        break
      case 'notification':
        handleNotification(message.data)
        break
      case 'pong':
        // Heartbeat response
        break
      default:
        logger.info('Unknown message type:', message.type)
    }
  }, [])

  // Handle new message
  const handleNewMessage = useCallback((messageData: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.find(m => m.id === messageData.id)) {
        return prev
      }
      return [...prev, messageData].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    })

    // Update channel last message
    setChannels(prev => prev.map(channel => 
      channel.id === messageData.channelId
        ? { ...channel, lastMessage: messageData, lastActivity: messageData.createdAt }
        : channel
    ))

    // Create notification if not from current user
    if (messageData.senderId !== userId) {
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        userId,
        type: 'message',
        title: `New message from ${messageData.senderName}`,
        message: messageData.content.length > 50 
          ? messageData.content.substring(0, 50) + '...'
          : messageData.content,
        channelId: messageData.channelId,
        messageId: messageData.id,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        isRead: false,
        priority: messageData.priority,
        createdAt: new Date().toISOString()
      }
      
      setNotifications(prev => [notification, ...prev])
    }
  }, [userId])

  // Handle typing indicators
  const handleTypingStart = useCallback((data: { userId: string, userName: string, channelId: string }) => {
    if (data.userId !== userId) {
      setTypingUsers(prev => {
        const existing = prev.find(u => u.id === data.userId)
        if (existing) return prev
        
        return [...prev, {
          id: data.userId,
          name: data.userName,
          email: '',
          isVerified: false,
          isGovernment: false,
          isIndigenous: false,
          presenceStatus: 'online' as PresenceStatus,
          lastSeen: new Date().toISOString(),
          preferredLanguage: 'en',
          timeZone: 'America/Toronto'
        }]
      })

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.id !== data.userId))
      }, 3000)
    }
  }, [userId])

  const handleTypingStop = useCallback((data: { userId: string }) => {
    setTypingUsers(prev => prev.filter(u => u.id !== data.userId))
  }, [])

  // Handle presence updates
  const handlePresenceUpdate = useCallback((data: { userId: string, status: PresenceStatus, user: User }) => {
    if (data.status === 'online') {
      setOnlineUsers(prev => {
        const existing = prev.find(u => u.id === data.userId)
        if (existing) return prev
        return [...prev, data.user]
      })
    } else {
      setOnlineUsers(prev => prev.filter(u => u.id !== data.userId))
    }
  }, [])

  // Handle channel updates
  const handleChannelUpdate = useCallback((channelData: Channel) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelData.id ? channelData : channel
    ))
  }, [])

  // Handle notifications
  const handleNotification = useCallback((notificationData: Notification) => {
    setNotifications(prev => [notificationData, ...prev])
  }, [])

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true)

      // Mock data for development
      const mockChannels: Channel[] = [
        {
          id: 'channel-1',
          name: 'Highway Infrastructure RFQ',
          description: 'Discussion for Highway Bridge Rehabilitation Project',
          type: 'rfq',
          isPrivate: false,
          isEncrypted: true,
          createdById: 'user-gov-1',
          createdByName: 'Transport Canada',
          participants: [
            {
              id: 'part-1',
              userId: userId,
              userName: 'Your Company',
              userAvatar: undefined,
              channelId: 'channel-1',
              role: 'member',
              joinedAt: '2024-01-20T10:00:00Z',
              lastReadAt: '2024-01-25T15:30:00Z',
              notificationSettings: {
                muted: false,
                mentions: 'all',
                keywords: [],
                email: true,
                push: true,
                desktop: true,
                sound: true,
                vibration: true
              },
              permissions: {
                canRead: true,
                canWrite: true,
                canUploadFiles: true,
                canManageMembers: false,
                canManageChannel: false,
                canDeleteMessages: false,
                canPinMessages: false,
                canCreateThreads: true,
                canUseVideoCall: true,
                canScreenShare: false
              },
              isActive: true
            }
          ],
          lastActivity: '2024-01-25T16:00:00Z',
          messageCount: 45,
          unreadCount: 3,
          settings: {
            allowFileUploads: true,
            maxFileSize: 100 * 1024 * 1024, // 100MB
            allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
            messageRetention: 365,
            requireApproval: false,
            moderationEnabled: true,
            autoTranslation: true,
            allowReactions: true,
            allowThreads: true,
            allowVideoCall: true,
            culturalGuidelines: 'Please respect Indigenous protocols and traditional knowledge sharing practices.'
          },
          createdAt: '2024-01-15T09:00:00Z',
          updatedAt: '2024-01-25T16:00:00Z',
          rfqId: 'rfq-001',
          rfqTitle: 'Highway Bridge Rehabilitation Project'
        },
        {
          id: 'channel-2',
          name: 'Mikisew Cree First Nation',
          description: 'Community announcements and discussions',
          type: 'community',
          isPrivate: false,
          isEncrypted: true,
          createdById: 'user-chief-1',
          createdByName: 'Chief Mikisew',
          participants: [
            {
              id: 'part-2',
              userId: userId,
              userName: 'Your Company',
              userAvatar: undefined,
              channelId: 'channel-2',
              role: 'member',
              joinedAt: '2024-01-10T14:00:00Z',
              notificationSettings: {
                muted: false,
                mentions: 'mentions',
                keywords: ['opportunity', 'contract'],
                email: true,
                push: true,
                desktop: true,
                sound: true,
                vibration: true
              },
              permissions: {
                canRead: true,
                canWrite: true,
                canUploadFiles: true,
                canManageMembers: false,
                canManageChannel: false,
                canDeleteMessages: false,
                canPinMessages: false,
                canCreateThreads: true,
                canUseVideoCall: true,
                canScreenShare: false
              },
              isActive: true
            }
          ],
          lastActivity: '2024-01-25T12:00:00Z',
          messageCount: 128,
          unreadCount: 0,
          settings: {
            allowFileUploads: true,
            maxFileSize: 50 * 1024 * 1024, // 50MB
            allowedFileTypes: ['pdf', 'doc', 'jpg', 'png'],
            messageRetention: 1095, // 3 years
            requireApproval: true,
            moderationEnabled: true,
            autoTranslation: true,
            allowReactions: true,
            allowThreads: true,
            allowVideoCall: true,
            culturalGuidelines: 'This is a sacred space for community communication. Please speak with respect and follow traditional protocols.',
            traditionalProtocols: ['Elder approval required for major announcements', 'Traditional greetings encouraged']
          },
          createdAt: '2024-01-01T12:00:00Z',
          updatedAt: '2024-01-25T12:00:00Z',
          nationId: 'nation-mikisew',
          traditionalName: 'ᒥᑭᓱ ᓀᐦᐃᔭᐤ'
        },
        {
          id: 'channel-3',
          name: 'Direct: Transport Canada',
          description: 'Private conversation',
          type: 'direct',
          isPrivate: true,
          isEncrypted: true,
          createdById: 'user-gov-1',
          createdByName: 'Transport Canada',
          participants: [
            {
              id: 'part-3',
              userId: userId,
              userName: 'Your Company',
              userAvatar: undefined,
              channelId: 'channel-3',
              role: 'member',
              joinedAt: '2024-01-22T09:00:00Z',
              notificationSettings: {
                muted: false,
                mentions: 'all',
                keywords: [],
                email: true,
                push: true,
                desktop: true,
                sound: true,
                vibration: true
              },
              permissions: {
                canRead: true,
                canWrite: true,
                canUploadFiles: true,
                canManageMembers: false,
                canManageChannel: false,
                canDeleteMessages: false,
                canPinMessages: false,
                canCreateThreads: false,
                canUseVideoCall: true,
                canScreenShare: true
              },
              isActive: true
            }
          ],
          lastActivity: '2024-01-25T14:30:00Z',
          messageCount: 12,
          unreadCount: 1,
          settings: {
            allowFileUploads: true,
            maxFileSize: 25 * 1024 * 1024, // 25MB
            allowedFileTypes: ['pdf', 'doc', 'docx'],
            messageRetention: 90,
            requireApproval: false,
            moderationEnabled: false,
            autoTranslation: false,
            allowReactions: true,
            allowThreads: false,
            allowVideoCall: true
          },
          createdAt: '2024-01-22T09:00:00Z',
          updatedAt: '2024-01-25T14:30:00Z'
        }
      ]

      // Mock messages for active channel
      const mockMessages: Message[] = [
        {
          id: 'msg-1',
          channelId: 'channel-1',
          senderId: 'user-gov-1',
          senderName: 'Transport Canada',
          senderAvatar: undefined,
          type: 'text',
          content: 'Welcome to the Highway Bridge Rehabilitation Project discussion. Please review the RFQ documents and feel free to ask any questions.',
          status: 'delivered',
          isSystem: false,
          priority: 'normal',
          createdAt: '2024-01-25T09:00:00Z',
          updatedAt: '2024-01-25T09:00:00Z',
          reactions: []
        },
        {
          id: 'msg-2',
          channelId: 'channel-1',
          senderId: userId,
          senderName: 'Your Company',
          senderAvatar: undefined,
          type: 'text',
          content: 'Thank you for the opportunity. We have extensive experience with bridge rehabilitation projects and strong Indigenous content capabilities.',
          status: 'read',
          isSystem: false,
          priority: 'normal',
          createdAt: '2024-01-25T10:15:00Z',
          updatedAt: '2024-01-25T10:15:00Z',
          reactions: [
            {
              id: 'react-1',
              messageId: 'msg-2',
              userId: 'user-gov-1',
              userName: 'Transport Canada',
              emoji: '👍',
              createdAt: '2024-01-25T10:16:00Z'
            }
          ]
        },
        {
          id: 'msg-3',
          channelId: 'channel-1',
          senderId: 'user-competitor-1',
          senderName: 'Northern Construction Ltd',
          senderAvatar: undefined,
          type: 'text',
          content: 'We are also very interested in this project. Our team has been working on similar infrastructure projects across the territories.',
          status: 'delivered',
          isSystem: false,
          priority: 'normal',
          createdAt: '2024-01-25T11:30:00Z',
          updatedAt: '2024-01-25T11:30:00Z',
          reactions: []
        },
        {
          id: 'msg-4',
          channelId: 'channel-1',
          senderId: 'user-gov-1',
          senderName: 'Transport Canada',
          senderAvatar: undefined,
          type: 'text',
          content: 'Excellent! Both companies bring valuable experience. The deadline for questions is February 10th, and we encourage all potential bidders to review the Indigenous content requirements carefully.',
          status: 'delivered',
          isSystem: false,
          priority: 'high',
          createdAt: '2024-01-25T15:45:00Z',
          updatedAt: '2024-01-25T15:45:00Z',
          reactions: [],
          mentions: [userId, 'user-competitor-1']
        }
      ]

      // Mock notifications
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          userId,
          type: 'mention',
          title: 'You were mentioned',
          message: 'Transport Canada mentioned you in Highway Infrastructure RFQ',
          channelId: 'channel-1',
          messageId: 'msg-4',
          senderId: 'user-gov-1',
          senderName: 'Transport Canada',
          isRead: false,
          priority: 'high',
          actionUrl: '/messages/channel-1',
          createdAt: '2024-01-25T15:45:00Z'
        },
        {
          id: 'notif-2',
          userId,
          type: 'message',
          title: 'New message in Mikisew Cree First Nation',
          message: 'Chief announced new community project opportunities',
          channelId: 'channel-2',
          isRead: true,
          priority: 'normal',
          createdAt: '2024-01-25T12:00:00Z',
          readAt: '2024-01-25T13:00:00Z'
        }
      ]

      setChannels(mockChannels)
      setMessages(mockMessages)
      setNotifications(mockNotifications)

    } catch (error) {
      logger.error('Failed to load communication data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Send message
  const sendMessage = useCallback(async (
    content: string, 
    type: MessageType = 'text', 
    attachments?: File[]
  ) => {
    if (!activeChannel || !content.trim()) return

    try {
      const message: Message = {
        id: `msg-${Date.now()}`,
        channelId: activeChannel.id,
        senderId: userId,
        senderName: 'Your Company', // Would come from user profile
        type,
        content: content.trim(),
        status: 'sending',
        isSystem: false,
        priority: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reactions: []
      }

      // Add to local state immediately for optimistic UI
      setMessages(prev => [...prev, message])

      // Send via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'send_message',
          data: message,
          timestamp: new Date().toISOString()
        }))
      }

      // Update message status to sent
      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, status: 'sent' as MessageStatus } : m
        ))
      }, 100)

    } catch (error) {
      logger.error('Failed to send message:', error)
    }
  }, [activeChannel, userId])

  // Join channel
  const joinChannel = useCallback(async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId)
    if (!channel) return

    setActiveChannel(channel)

    // Load messages for this channel
    const channelMessages = messages.filter(m => m.channelId === channelId)
    setMessages(channelMessages)

    // Send join event via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_channel',
        data: { channelId, userId },
        timestamp: new Date().toISOString()
      }))
    }
  }, [channels, messages, userId])

  // Leave channel
  const leaveChannel = useCallback(async (channelId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_channel',
        data: { channelId, userId },
        timestamp: new Date().toISOString()
      }))
    }

    if (activeChannel?.id === channelId) {
      setActiveChannel(null)
      setMessages([])
    }
  }, [activeChannel, userId])

  // Update presence
  const updatePresence = useCallback(async (status: PresenceStatus) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presence_update',
        data: { userId, status },
        timestamp: new Date().toISOString()
      }))
    }
  }, [userId])

  // Mark messages as read
  const markAsRead = useCallback(async (channelId: string) => {
    // Update local state
    setChannels(prev => prev.map(channel => 
      channel.id === channelId ? { ...channel, unreadCount: 0 } : channel
    ))

    // Send read receipt via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_read',
        data: { channelId, userId },
        timestamp: new Date().toISOString()
      }))
    }
  }, [userId])

  // Send typing indicator
  const sendTypingIndicator = useCallback((channelId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop',
        data: { channelId, userId },
        timestamp: new Date().toISOString()
      }))
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(channelId, false)
      }, 3000)
    }
  }, [userId])

  // Initialize
  useEffect(() => {
    if (userId) {
      loadInitialData()
      connectWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [userId, connectWebSocket])

  return {
    channels,
    activeChannel,
    messages,
    notifications,
    typingUsers,
    onlineUsers,
    loading,
    connectionStatus,
    sendMessage,
    joinChannel,
    leaveChannel,
    updatePresence,
    markAsRead,
    sendTypingIndicator
  }
}