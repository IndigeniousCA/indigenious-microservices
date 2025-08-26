'use client'

import React, { useState, useRef, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, Send, X, Minimize2, Maximize2,
  Bot, User, Loader2, Paperclip, Mic, StopCircle
} from 'lucide-react'
import { UserContext } from '../types'
import { ContextHelpService } from '../services/ContextHelpService'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'

interface HelpAssistantProps {
  context: UserContext
  onClose: () => void
}

interface Message {
  id: string
  sender: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: string[]
}

export function HelpAssistant({ context, onClose }: HelpAssistantProps) {
  const [helpService] = useState(() => new ContextHelpService())
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  useEffect(() => {
    // Start conversation
    initializeConversation()
  }, [])

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeConversation = async () => {
    const conversation = await helpService.startHelpChat(context)
    setConversationId(conversation.id)
    setMessages(conversation.messages.map(m => ({
      id: m.id,
      sender: m.sender as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp
    })))
  }

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await helpService.continueChat(conversationId, input)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      logger.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // In production, implement actual voice recording
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        height: isMinimized ? 60 : 500
      }}
      className="fixed bottom-6 right-6 w-96 z-50"
    >
      <GlassPanel className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
            </div>
            <div>
              <h3 className="text-white font-medium">Help Assistant</h3>
              <p className="text-xs text-white/60">Always here to help</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4 text-white/60" />
              ) : (
                <Minimize2 className="w-4 h-4 text-white/60" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-blue-500/20' 
                      : 'bg-purple-500/20'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Bot className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                  
                  <div className={`flex-1 ${
                    message.sender === 'user' ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                      message.sender === 'user'
                        ? 'bg-blue-500/20 text-white'
                        : 'bg-white/10 text-white/90'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
                      {message.attachments && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                              <Paperclip className="w-3 h-3" />
                              {attachment}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto">
                {[
                  'How do I submit a bid?',
                  'Find Indigenous partners',
                  'Check compliance',
                  'Upload documents'
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(action)}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-xs text-white/80 whitespace-nowrap transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <GlassInput
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your question..."
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => logger.info('Attach file')}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <Paperclip className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={toggleRecording}
                      className={`p-2 hover:bg-white/10 rounded transition-colors ${
                        isRecording ? 'bg-red-500/20' : ''
                      }`}
                    >
                      {isRecording ? (
                        <StopCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Mic className="w-4 h-4 text-white/60" />
                      )}
                    </button>
                  </div>
                </div>
                
                <GlassButton
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
          </>
        )}
      </GlassPanel>
    </motion.div>
  )
}