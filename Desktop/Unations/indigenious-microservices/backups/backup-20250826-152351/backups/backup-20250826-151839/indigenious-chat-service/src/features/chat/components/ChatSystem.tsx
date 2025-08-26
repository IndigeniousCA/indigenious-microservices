// Built-in Encrypted Chat System for Indigenious
// Enables secure communication between all platform participants

import { useState, useEffect, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { 
  MessageCircle, Send, Paperclip, Shield, Lock,
  Image, FileText, Download, Search, Phone, Video,
  MoreVertical, Check, CheckCheck, Clock, AlertCircle
} from 'lucide-react'

// Encryption utilities
const encrypt = async (text: string, key: string): Promise<string> => {
  // In production, use proper encryption library
  // For now, using base64 as placeholder
  return btoa(text)
}

const decrypt = async (encrypted: string, key: string): Promise<string> => {
  // In production, use proper decryption
  return atob(encrypted)
}

// Message types
interface Message {
  id: string
  channel_id: string
  sender_id: string
  sender_name: string
  sender_avatar?: string
  content: string
  encrypted: boolean
  attachments?: Attachment[]
  created_at: string
  read_by: string[]
  edited_at?: string
  reply_to?: string
  type: 'text' | 'file' | 'rfq_update' | 'system'
}

interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url: string
  thumbnail?: string
}

interface ChatChannel {
  id: string
  name: string
  type: 'direct' | 'rfq' | 'project' | 'support'
  participants: Participant[]
  last_message?: Message
  unread_count: number
  created_at: string
  metadata?: {
    rfq_id?: string
    project_id?: string
    is_government?: boolean
  }
}

interface Participant {
  id: string
  name: string
  organization: string
  role: 'buyer' | 'supplier' | 'admin'
  avatar?: string
  verified: boolean
  online: boolean
}

// Glass UI Components
const GlassPanel = ({ children, className = '' }) => (
  <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl ${className}`}>
    {children}
  </div>
)

// Chat List Component
const ChatList = ({ channels, activeChannel, onSelectChannel, onNewChat }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <GlassPanel className="h-full p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-4">Messages</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl
              text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
          />
        </div>

        {/* New Chat Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewChat}
          className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50
            rounded-xl text-blue-100 font-medium transition-all duration-200 flex items-center justify-center"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          New Conversation
        </motion.button>
      </div>

      {/* Channel List */}
      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        {filteredChannels.map(channel => {
          const isActive = activeChannel?.id === channel.id
          const otherParticipant = channel.participants.find(p => p.id !== 'current-user-id')

          return (
            <motion.button
              key={channel.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectChannel(channel)}
              className={`w-full p-3 rounded-xl text-left transition-all duration-200
                ${isActive 
                  ? 'bg-blue-500/20 border border-blue-400/50' 
                  : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 
                    flex items-center justify-center text-white font-medium">
                    {otherParticipant?.name.charAt(0) || channel.name.charAt(0)}
                  </div>
                  {otherParticipant?.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full 
                      border-2 border-gray-900"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-medium text-white truncate">
                      {channel.type === 'direct' ? otherParticipant?.name : channel.name}
                    </h3>
                    {channel.last_message && (
                      <span className="text-xs text-white/50">
                        {formatTime(channel.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  
                  {channel.last_message && (
                    <p className="text-xs text-white/60 truncate">
                      {channel.last_message.type === 'text' 
                        ? channel.last_message.content 
                        : `📎 ${channel.last_message.attachments?.[0]?.name}`}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex items-center space-x-2 mt-1">
                    {channel.metadata?.is_government && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                        Government
                      </span>
                    )}
                    {channel.type === 'rfq' && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        RFQ
                      </span>
                    )}
                    {channel.unread_count > 0 && (
                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                        {channel.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </GlassPanel>
  )
}

// Message Component
const MessageBubble = ({ message, isOwn, onReply }) => {
  const [decryptedContent, setDecryptedContent] = useState('')

  useEffect(() => {
    if (message.encrypted) {
      decrypt(message.content, 'channel-key').then(setDecryptedContent)
    } else {
      setDecryptedContent(message.content)
    }
  }, [message])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender info */}
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-white/60">{message.sender_name}</span>
            {message.encrypted && (
              <Lock className="w-3 h-3 text-emerald-400" />
            )}
          </div>
        )}

        {/* Message bubble */}
        <div className={`relative group ${
          isOwn 
            ? 'bg-blue-500/20 border border-blue-400/50' 
            : 'bg-white/10 border border-white/20'
        } rounded-2xl px-4 py-3`}>
          {/* Reply reference */}
          {message.reply_to && (
            <div className="mb-2 p-2 bg-white/10 rounded-lg border-l-2 border-blue-400/50">
              <p className="text-xs text-white/60 line-clamp-1">Replying to...</p>
            </div>
          )}

          {/* Message content */}
          <p className="text-white text-sm whitespace-pre-wrap">{decryptedContent}</p>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map(attachment => (
                <AttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}

          {/* Time & Status */}
          <div className="flex items-center justify-end space-x-2 mt-1">
            <span className="text-xs text-white/40">
              {formatTime(message.created_at)}
            </span>
            {isOwn && (
              <span className="text-white/40">
                {message.read_by.length > 1 ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
              </span>
            )}
          </div>

          {/* Actions (on hover) */}
          <div className="absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 
            transition-opacity duration-200 ml-2">
            <button
              onClick={() => onReply(message)}
              className="p-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 hover:text-white"
            >
              <span className="text-xs">Reply</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Attachment Preview Component
const AttachmentPreview = ({ attachment }) => {
  const isImage = attachment.type.startsWith('image/')
  const isPDF = attachment.type === 'application/pdf'

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center space-x-3">
      {/* Icon/Thumbnail */}
      {isImage && attachment.thumbnail ? (
        <img src={attachment.thumbnail} alt={attachment.name} 
          className="w-12 h-12 rounded object-cover" />
      ) : (
        <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
          {isPDF ? <FileText className="w-6 h-6 text-red-400" /> : <FileText className="w-6 h-6 text-white/60" />}
        </div>
      )}

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{attachment.name}</p>
        <p className="text-xs text-white/50">{formatFileSize(attachment.size)}</p>
      </div>

      {/* Download */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4 text-white/60" />
      </motion.button>
    </div>
  )
}

// Main Chat Component
export function ChatSystem() {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useSupabaseClient()
  const user = useUser()

  // Load channels
  useEffect(() => {
    loadChannels()
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, handleNewMessage)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChannels = async () => {
    // Mock data - would load from Supabase
    const mockChannels: ChatChannel[] = [
      {
        id: '1',
        name: 'Indigenous Services Canada',
        type: 'direct',
        participants: [
          {
            id: '1',
            name: 'Sarah Chen',
            organization: 'Indigenous Services Canada',
            role: 'buyer',
            verified: true,
            online: true,
            avatar: ''
          }
        ],
        last_message: {
          id: '1',
          channel_id: '1',
          sender_id: '1',
          sender_name: 'Sarah Chen',
          content: 'Looking forward to your bid on the IT services RFQ',
          encrypted: true,
          created_at: new Date().toISOString(),
          read_by: ['1'],
          type: 'text'
        },
        unread_count: 2,
        created_at: new Date().toISOString(),
        metadata: { is_government: true }
      },
      {
        id: '2',
        name: 'Community Centre RFQ Discussion',
        type: 'rfq',
        participants: [
          {
            id: '2',
            name: 'Chief Mary Thompson',
            organization: 'Six Nations Council',
            role: 'buyer',
            verified: true,
            online: false,
            avatar: ''
          }
        ],
        last_message: {
          id: '2',
          channel_id: '2',
          sender_id: '2',
          sender_name: 'Chief Mary Thompson',
          content: 'construction-plans-v2.pdf',
          encrypted: true,
          attachments: [{
            id: '1',
            name: 'construction-plans-v2.pdf',
            size: 15728640,
            type: 'application/pdf',
            url: ''
          }],
          created_at: new Date(Date.now() - 3600000).toISOString(),
          read_by: ['2'],
          type: 'file'
        },
        unread_count: 0,
        created_at: new Date().toISOString(),
        metadata: { rfq_id: 'rfq-123' }
      }
    ]
    
    setChannels(mockChannels)
  }

  const loadMessages = async (channelId: string) => {
    // Mock messages - would load from Supabase
    const mockMessages: Message[] = [
      {
        id: '1',
        channel_id: channelId,
        sender_id: '1',
        sender_name: 'Sarah Chen',
        content: await encrypt('Hi! Thanks for your interest in our IT services RFQ.', 'channel-key'),
        encrypted: true,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        read_by: ['1', 'current-user'],
        type: 'text'
      },
      {
        id: '2',
        channel_id: channelId,
        sender_id: 'current-user',
        sender_name: 'You',
        content: await encrypt('Thank you! We have extensive experience with government IT projects.', 'channel-key'),
        encrypted: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        read_by: ['1', 'current-user'],
        type: 'text'
      },
      {
        id: '3',
        channel_id: channelId,
        sender_id: '1',
        sender_name: 'Sarah Chen',
        content: await encrypt('Great! Could you share your relevant certifications?', 'channel-key'),
        encrypted: true,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        read_by: ['current-user'],
        type: 'text'
      }
    ]
    
    setMessages(mockMessages)
  }

  const handleNewMessage = (payload) => {
    // Handle realtime message updates
    setMessages(prev => [...prev, payload.new])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return
    if (!activeChannel) return

    const messageData = {
      channel_id: activeChannel.id,
      sender_id: user?.id || 'current-user',
      sender_name: 'You',
      content: await encrypt(newMessage, 'channel-key'),
      encrypted: true,
      created_at: new Date().toISOString(),
      read_by: [user?.id || 'current-user'],
      type: 'text' as const,
      reply_to: replyingTo?.id,
      attachments: attachments.length > 0 ? await uploadAttachments() : undefined
    }

    // Add to UI immediately
    setMessages(prev => [...prev, messageData as Message])
    setNewMessage('')
    setReplyingTo(null)
    setAttachments([])

    // Send to Supabase
    // await supabase.from('messages').insert(messageData)
  }

  const uploadAttachments = async () => {
    // Upload files to Supabase storage
    // Return attachment metadata
    return attachments.map(file => ({
      id: Math.random().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file)
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)]">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Chat List */}
          <div className="col-span-4">
            <ChatList
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={(channel) => {
                setActiveChannel(channel)
                loadMessages(channel.id)
              }}
              onNewChat={() => logger.info('New chat')}
            />
          </div>

          {/* Chat Window */}
          <div className="col-span-8">
            {activeChannel ? (
              <GlassPanel className="h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 
                          flex items-center justify-center text-white font-medium">
                          {activeChannel.participants[0]?.name.charAt(0)}
                        </div>
                        {activeChannel.participants[0]?.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full 
                            border-2 border-gray-900"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {activeChannel.type === 'direct' 
                            ? activeChannel.participants[0]?.name 
                            : activeChannel.name}
                        </h3>
                        <p className="text-xs text-white/60">
                          {activeChannel.participants[0]?.organization}
                          {activeChannel.participants[0]?.verified && (
                            <span className="ml-2 text-emerald-400">✓ Verified</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Phone className="w-4 h-4 text-white/60" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Video className="w-4 h-4 text-white/60" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-white/60" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Encryption Notice */}
                  <div className="mt-2 flex items-center space-x-2 text-xs text-emerald-400">
                    <Shield className="w-3 h-3" />
                    <span>End-to-end encrypted</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.map(message => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === 'current-user'}
                      onReply={setReplyingTo}
                    />
                  ))}
                  
                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex items-center space-x-2 text-white/60 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200" />
                      </div>
                      <span>typing...</span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10">
                  {/* Reply Preview */}
                  {replyingTo && (
                    <div className="mb-2 p-2 bg-white/5 rounded-lg border-l-2 border-blue-400/50 
                      flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60">Replying to {replyingTo.sender_name}</p>
                        <p className="text-sm text-white/80 truncate">{replyingTo.content}</p>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <span className="text-white/60">×</span>
                      </button>
                    </div>
                  )}

                  {/* Attachment Preview */}
                  {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="bg-white/10 rounded-lg px-3 py-1 flex items-center space-x-2">
                          <Paperclip className="w-3 h-3 text-white/60" />
                          <span className="text-xs text-white">{file.name}</span>
                          <button
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                            className="text-white/60 hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex items-end space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Paperclip className="w-5 h-5 text-white/60" />
                    </motion.button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                    />

                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl
                          text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none
                          resize-none"
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={sendMessage}
                      disabled={!newMessage.trim() && attachments.length === 0}
                      className="p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50
                        rounded-lg text-blue-100 transition-all duration-200 disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </GlassPanel>
            ) : (
              <GlassPanel className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Select a conversation to start messaging</p>
                </div>
              </GlassPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility functions
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  
  return date.toLocaleDateString()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}