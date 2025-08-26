// AI Assistant Component
// Conversational AI interface for platform support

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, Send, Bot, User, Globe, Sparkles,
  HelpCircle, Lightbulb, FileText, DollarSign, Users,
  RefreshCw, ChevronDown, Mic, Paperclip, X
} from 'lucide-react'
import { useAI } from '../hooks/useAI'

interface AIAssistantProps {
  userId: string
  businessId?: string
  culturalContext?: {
    community?: string
    language?: string
    protocols?: string[]
  }
}

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: string
  suggestions?: string[]
  attachments?: Array<{
    name: string
    type: string
  }>
}

interface QuickAction {
  icon: any
  label: string
  query: string
  color: string
}

export function AIAssistant({ 
  userId, 
  businessId,
  culturalContext 
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: culturalContext?.community 
        ? `Aaniin! Welcome to the Indigenious AI Assistant. I'm here to help you navigate procurement opportunities and grow your business. How can I assist you today?`
        : `Hello! I'm your AI assistant for the Indigenious platform. I can help you find opportunities, prepare bids, understand requirements, and much more. What would you like to know?`,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
      suggestions: [
        'Show me matching opportunities',
        'Help me prepare a bid',
        'Explain Indigenous procurement benefits',
        'Find potential partners'
      ]
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { sendMessage, chatContext, resetChat } = useAI({ 
    userId, 
    businessId,
    culturalContext 
  })

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      icon: FileText,
      label: 'Find RFQs',
      query: 'Show me relevant RFQs for my business',
      color: 'blue'
    },
    {
      icon: DollarSign,
      label: 'Price Help',
      query: 'Help me optimize my bid pricing',
      color: 'emerald'
    },
    {
      icon: Users,
      label: 'Partners',
      query: 'Find potential partnership opportunities',
      color: 'purple'
    },
    {
      icon: HelpCircle,
      label: 'Platform Help',
      query: 'How do I use the platform?',
      color: 'amber'
    }
  ]

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle message send
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      const response = await sendMessage(inputValue)
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        content: response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        suggestions: chatContext?.suggestedResponses
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        content: 'I apologize, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  // Handle quick action click
  const handleQuickAction = (query: string) => {
    setInputValue(query)
    inputRef.current?.focus()
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    handleSendMessage()
  }

  // Handle voice input (mock)
  const handleVoiceInput = () => {
    setIsListening(!isListening)
    // In production, integrate with Web Speech API
    if (!isListening) {
      setTimeout(() => {
        setInputValue('Show me RFQs in construction category')
        setIsListening(false)
      }, 2000)
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-[600px] bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Assistant</h3>
              <p className="text-white/60 text-sm">
                {culturalContext?.language === 'oj' ? 'Anishinaabemowin enabled' :
                 culturalContext?.language === 'fr' ? 'Assistant bilingue' :
                 'Always here to help'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {culturalContext && (
              <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                <Globe className="w-3 h-3 inline mr-1" />
                {culturalContext.community || 'Indigenous'}
              </div>
            )}
            <button
              onClick={() => {
                resetChat()
                setMessages([messages[0]]) // Keep welcome message
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Reset conversation"
            >
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className="text-white/60 text-sm whitespace-nowrap">Quick actions:</span>
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.query)}
              className={`flex items-center space-x-2 px-3 py-1.5 bg-${action.color}-500/20 
                hover:bg-${action.color}-500/30 border border-${action.color}-400/50 
                rounded-lg text-${action.color}-200 text-sm whitespace-nowrap transition-colors`}
            >
              <action.icon className="w-4 h-4" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`p-2 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-blue-500/20' 
                    : 'bg-purple-500/20'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                
                <div>
                  <div className={`px-4 py-3 rounded-xl ${
                    message.sender === 'user'
                      ? 'bg-blue-500/20 text-white'
                      : 'bg-white/10 text-white/90'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, i) => (
                          <div key={i} className="flex items-center space-x-2 text-xs text-white/60">
                            <Paperclip className="w-3 h-3" />
                            <span>{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 
                            border border-white/10 rounded-lg text-white/80 text-sm transition-colors"
                        >
                          <Lightbulb className="w-3 h-3 text-amber-400 inline mr-2" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-white/40 text-xs mt-1">{formatTime(message.timestamp)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2"
          >
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="px-4 py-3 bg-white/10 rounded-xl">
              <div className="flex space-x-1">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-purple-400 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-purple-400 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 bg-purple-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/20 p-4">
        <div className="flex items-end space-x-2">
          <button
            onClick={() => {/* Handle attachments */}}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-white/60" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type your message..."
              rows={1}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 
                focus:ring-purple-400 resize-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={handleVoiceInput}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500/20 text-red-400' 
                : 'hover:bg-white/10 text-white/60'
            }`}
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 
              rounded-lg text-purple-200 transition-colors disabled:opacity-50 
              disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}