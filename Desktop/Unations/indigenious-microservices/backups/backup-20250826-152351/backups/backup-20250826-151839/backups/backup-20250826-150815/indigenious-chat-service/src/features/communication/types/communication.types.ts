// Communication Types
// TypeScript types for messaging and communication features

export type MessageType = 'text' | 'file' | 'image' | 'video' | 'audio' | 'system' | 'announcement'
export type ChannelType = 'direct' | 'rfq' | 'community' | 'support' | 'elder' | 'public'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type ParticipantRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest'
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  title?: string
  organization?: string
  isVerified: boolean
  isGovernment: boolean
  isIndigenous: boolean
  nation?: string
  territory?: string
  presenceStatus: PresenceStatus
  lastSeen: string
  preferredLanguage: string
  timeZone: string
}

export interface Message {
  id: string
  channelId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  type: MessageType
  content: string
  encryptedContent?: string
  attachments?: Attachment[]
  replyToId?: string
  replyToMessage?: Message
  mentions?: string[]
  reactions?: Reaction[]
  editedAt?: string
  deletedAt?: string
  status: MessageStatus
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  expiresAt?: string
  isSystem: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  translation?: Record<string, string>
}

export interface Attachment {
  id: string
  messageId: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  downloadUrl: string
  thumbnailUrl?: string
  isEncrypted: boolean
  encryptionKey?: string
  checksum: string
  uploadedAt: string
  scannedAt?: string
  isClean: boolean
}

export interface Reaction {
  id: string
  messageId: string
  userId: string
  userName: string
  emoji: string
  createdAt: string
}

export interface Channel {
  id: string
  name: string
  description?: string
  type: ChannelType
  isPrivate: boolean
  isEncrypted: boolean
  createdById: string
  createdByName: string
  participants: Participant[]
  lastMessage?: Message
  lastActivity: string
  messageCount: number
  unreadCount: number
  metadata?: Record<string, any>
  settings: ChannelSettings
  createdAt: string
  updatedAt: string
  archivedAt?: string
  
  // RFQ-specific
  rfqId?: string
  rfqTitle?: string
  
  // Community-specific
  nationId?: string
  territoryId?: string
  
  // Cultural context
  traditionalName?: string
  culturalProtocols?: string[]
  requiresElderApproval?: boolean
}

export interface Participant {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  channelId: string
  role: ParticipantRole
  joinedAt: string
  lastReadAt?: string
  notificationSettings: NotificationSettings
  permissions: ParticipantPermissions
  isActive: boolean
  invitedById?: string
}

export interface ParticipantPermissions {
  canRead: boolean
  canWrite: boolean
  canUploadFiles: boolean
  canManageMembers: boolean
  canManageChannel: boolean
  canDeleteMessages: boolean
  canPinMessages: boolean
  canCreateThreads: boolean
  canUseVideoCall: boolean
  canScreenShare: boolean
}

export interface ChannelSettings {
  allowFileUploads: boolean
  maxFileSize: number
  allowedFileTypes: string[]
  messageRetention: number // days
  requireApproval: boolean
  moderationEnabled: boolean
  autoTranslation: boolean
  allowReactions: boolean
  allowThreads: boolean
  allowVideoCall: boolean
  culturalGuidelines?: string
  traditionalProtocols?: string[]
}

export interface NotificationSettings {
  muted: boolean
  mutedUntil?: string
  mentions: 'all' | 'mentions' | 'none'
  keywords: string[]
  email: boolean
  push: boolean
  desktop: boolean
  sound: boolean
  vibration: boolean
}

export interface TypingIndicator {
  channelId: string
  userId: string
  userName: string
  startedAt: string
}

export interface MessageDraft {
  channelId: string
  content: string
  attachments: File[]
  replyToId?: string
  lastSaved: string
}

export interface VideoCall {
  id: string
  channelId: string
  initiatorId: string
  initiatorName: string
  participants: VideoParticipant[]
  status: 'waiting' | 'active' | 'ended'
  startedAt?: string
  endedAt?: string
  recordingUrl?: string
  isRecording: boolean
  metadata?: Record<string, any>
}

export interface VideoParticipant {
  userId: string
  userName: string
  joinedAt: string
  leftAt?: string
  isAudioMuted: boolean
  isVideoMuted: boolean
  isScreenSharing: boolean
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent'
}

export interface Notification {
  id: string
  userId: string
  type: 'message' | 'mention' | 'channel_invite' | 'video_call' | 'announcement'
  title: string
  message: string
  channelId?: string
  messageId?: string
  senderId?: string
  senderName?: string
  isRead: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  actionUrl?: string
  metadata?: Record<string, any>
  createdAt: string
  readAt?: string
  expiresAt?: string
}

export interface MessageThread {
  id: string
  parentMessageId: string
  channelId: string
  messages: Message[]
  participantCount: number
  lastActivity: string
  createdAt: string
  updatedAt: string
}

export interface ChatSession {
  id: string
  userId: string
  channels: Channel[]
  activeChannelId?: string
  unreadCount: number
  presenceStatus: PresenceStatus
  lastActivity: string
  connections: WebSocketConnection[]
}

export interface WebSocketConnection {
  id: string
  userId: string
  deviceId: string
  connectedAt: string
  lastPing: string
  isActive: boolean
}

export interface EncryptionKey {
  id: string
  channelId: string
  keyData: string
  algorithm: string
  createdAt: string
  expiresAt?: string
  isActive: boolean
}

export interface MessageFilter {
  channels?: string[]
  senders?: string[]
  types?: MessageType[]
  dateRange?: {
    start: string
    end: string
  }
  keywords?: string[]
  hasAttachments?: boolean
  isUnread?: boolean
  priority?: ('low' | 'normal' | 'high' | 'urgent')[]
}

export interface CommunicationStats {
  totalMessages: number
  totalChannels: number
  activeUsers: number
  averageResponseTime: number
  messageTypes: Record<MessageType, number>
  channelTypes: Record<ChannelType, number>
  filesSent: number
  totalFileSize: number
  videoCallMinutes: number
  languageDistribution: Record<string, number>
}

export interface Translation {
  id: string
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  confidence: number
  method: 'automatic' | 'human' | 'hybrid'
  translatedAt: string
  reviewedAt?: string
  isApproved: boolean
}

export interface CulturalProtocol {
  id: string
  name: string
  description: string
  applicableContexts: string[]
  guidelines: string[]
  restrictions: string[]
  nationSpecific?: string
  territorySpecific?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ModerationAction {
  id: string
  channelId?: string
  messageId?: string
  targetUserId?: string
  moderatorId: string
  moderatorName: string
  action: 'warn' | 'mute' | 'kick' | 'ban' | 'delete' | 'edit'
  reason: string
  duration?: number
  isActive: boolean
  appealable: boolean
  createdAt: string
  expiresAt?: string
}

export interface AuditLog {
  id: string
  userId?: string
  userName?: string
  action: string
  resource: string
  resourceId: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: string
  sessionId: string
}

export interface EmergencyAlert {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  scope: 'global' | 'national' | 'regional' | 'community'
  targetAudience: string[]
  createdById: string
  createdByName: string
  isActive: boolean
  acknowledgmentRequired: boolean
  acknowledgments: string[]
  createdAt: string
  expiresAt?: string
  cancelledAt?: string
}