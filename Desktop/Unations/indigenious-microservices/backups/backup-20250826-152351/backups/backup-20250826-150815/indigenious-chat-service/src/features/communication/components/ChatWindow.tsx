// Chat Window Component
// Individual conversation display and interaction

import { useState, useRef, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Paperclip, Smile, MoreVertical, Phone, Video,
  Info, Users, Shield, Flag, Mic, Image, File,
  Reply, Edit, Trash2, Copy, Pin, Calendar, Search
} from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import { FileUpload } from './FileUpload'
import { EmojiPicker } from './EmojiPicker'
import type { Channel, Message, User } from '../types/communication.types'

interface ChatWindowProps {
  channel: Channel
  messages: Message[]
  typingUsers: User[]
  onSendMessage: (content: string, type?: string, attachments?: File[]) => void
  userId: string
  userRole: string
}

export function ChatWindow({ 
  channel, 
  messages, 
  typingUsers, 
  onSendMessage, 
  userId, 
  userRole 
}: ChatWindowProps) {
  const [showChannelInfo, setShowChannelInfo] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filter messages by search
  const filteredMessages = searchQuery 
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  // Get channel participants
  const activeParticipants = channel.participants.filter(p => p.isActive)
  const participantCount = activeParticipants.length

  // Handle message actions
  const handleReply = (message: Message) => {
    setReplyToMessage(message)
    setSelectedMessage(null)
  }

  const handleEdit = (messageId: string) => {
    setEditingMessage(messageId)
    setSelectedMessage(null)
  }

  const handleDelete = (messageId: string) => {
    // This would call the delete message API
    logger.info('Deleting message:', messageId)
    setSelectedMessage(null)
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    setSelectedMessage(null)
  }

  const handlePin = (messageId: string) => {
    // This would call the pin message API
    logger.info('Pinning message:', messageId)
    setSelectedMessage(null)
  }

  // Check if user can perform actions
  const canEditMessage = (message: Message) => {
    return message.senderId === userId && !message.deletedAt
  }

  const canDeleteMessage = (message: Message) => {
    const userParticipant = channel.participants.find(p => p.userId === userId)
    return message.senderId === userId || userParticipant?.permissions.canDeleteMessages
  }

  // Get typing indicator text
  const getTypingText = () => {
    if (typingUsers.length === 0) return ''
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`
    if (typingUsers.length === 2) return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="p-4 border-b border-white/20 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Channel Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              channel.type === 'direct' ? 'bg-blue-500/20' :
              channel.type === 'rfq' ? 'bg-emerald-500/20' :
              channel.type === 'community' ? 'bg-purple-500/20' :
              channel.type === 'elder' ? 'bg-amber-500/20' :
              'bg-gray-500/20'
            }`}>
              {channel.type === 'direct' ? (
                <Users className={`w-5 h-5 ${
                  channel.type === 'direct' ? 'text-blue-400' :
                  channel.type === 'rfq' ? 'text-emerald-400' :
                  channel.type === 'community' ? 'text-purple-400' :
                  channel.type === 'elder' ? 'text-amber-400' :
                  'text-gray-400'
                }`} />
              ) : (
                <span className="text-white text-sm font-medium">
                  {channel.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <h2 className="font-semibold text-white flex items-center">
                {channel.name}
                {channel.isEncrypted && (
                  <Shield className="w-4 h-4 text-emerald-400 ml-2" />
                )}
                {channel.traditionalName && (
                  <span className="ml-2 text-sm text-purple-300">
                    ({channel.traditionalName})
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-3 text-sm text-white/60">
                <span>{participantCount} members</span>
                {channel.type === 'rfq' && channel.rfqTitle && (
                  <>
                    <span>•</span>
                    <span>{channel.rfqTitle}</span>
                  </>
                )}
                {typingUsers.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-400">{getTypingText()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => searchInputRef.current?.focus()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4 text-white/60" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="absolute right-0 top-0 w-0 focus:w-64 h-full px-3 bg-white/10 
                  border border-white/20 rounded-lg text-white placeholder-white/40 
                  focus:outline-none transition-all duration-300"
              />
            </div>

            {/* Video Call */}
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Video className="w-4 h-4 text-white/60" />
            </button>

            {/* Phone Call */}
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Phone className="w-4 h-4 text-white/60" />
            </button>

            {/* Channel Info */}
            <button
              onClick={() => setShowChannelInfo(!showChannelInfo)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Info className="w-4 h-4 text-white/60" />
            </button>

            {/* More Options */}
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Cultural Protocol Notice */}
        {channel.settings.culturalGuidelines && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <Flag className="w-4 h-4 text-purple-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-200">Cultural Guidelines</p>
                <p className="text-xs text-purple-100/80 mt-1">
                  {channel.settings.culturalGuidelines}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {filteredMessages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === userId}
              showSender={index === 0 || filteredMessages[index - 1].senderId !== message.senderId}
              isSelected={selectedMessage === message.id}
              onSelect={() => setSelectedMessage(
                selectedMessage === message.id ? null : message.id
              )}
              onReply={() => handleReply(message)}
              onEdit={canEditMessage(message) ? () => handleEdit(message.id) : undefined}
              onDelete={canDeleteMessage(message) ? () => handleDelete(message.id) : undefined}
              onCopy={() => handleCopy(message.content)}
              onPin={() => handlePin(message.id)}
              isEditing={editingMessage === message.id}
              channel={channel}
            />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center space-x-2 px-4"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-white/60">{getTypingText()}</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyToMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Reply className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-300">
                  Replying to {replyToMessage.senderName}
                </span>
              </div>
              <p className="text-sm text-blue-100/80 truncate">
                {replyToMessage.content}
              </p>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3 text-white/60" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Message Composer */}
      <div className="p-4 border-t border-white/20 bg-white/5 backdrop-blur-sm">
        <MessageComposer
          onSendMessage={onSendMessage}
          replyToMessage={replyToMessage}
          onClearReply={() => setReplyToMessage(null)}
          channel={channel}
          disabled={!channel.participants.find(p => p.userId === userId)?.permissions.canWrite}
        />

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFileUpload(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center"
            >
              <Paperclip className="w-4 h-4 text-white/60 mr-1" />
              <span className="text-xs text-white/60">Attach</span>
            </button>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center">
              <Image className="w-4 h-4 text-white/60 mr-1" />
              <span className="text-xs text-white/60">Image</span>
            </button>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center">
              <Mic className="w-4 h-4 text-white/60 mr-1" />
              <span className="text-xs text-white/60">Voice</span>
            </button>

            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center"
            >
              <Smile className="w-4 h-4 text-white/60 mr-1" />
              <span className="text-xs text-white/60">Emoji</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs text-white/40">
            {channel.isEncrypted && (
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Encrypted</span>
              </div>
            )}
            {channel.settings.messageRetention > 0 && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{channel.settings.messageRetention}d retention</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      <AnimatePresence>
        {showFileUpload && (
          <FileUpload
            onClose={() => setShowFileUpload(false)}
            onUpload={(files) => {
              onSendMessage('', 'file', files)
              setShowFileUpload(false)
            }}
            channel={channel}
          />
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <EmojiPicker
            onEmojiSelect={(emoji) => {
              // This would insert emoji into message composer
              logger.info('Selected emoji:', emoji)
              setShowEmojiPicker(false)
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}