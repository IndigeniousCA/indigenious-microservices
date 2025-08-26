// Messaging Dashboard Component
// Main communication interface with channels and chat

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, Users, Phone, Video, Settings, Search,
  Plus, Bell, Shield, Globe, Headphones, ChevronDown,
  Mic, MicOff, Camera, CameraOff, Monitor, MoreVertical
} from 'lucide-react'
import { ChannelList } from './ChannelList'
import { ChatWindow } from './ChatWindow'
import { VideoCall } from './VideoCall'
import { NotificationCenter } from './NotificationCenter'
import { useCommunication } from '../hooks/useCommunication'
import type { Channel, PresenceStatus } from '../types/communication.types'

interface MessagingDashboardProps {
  userId: string
  userRole: 'business' | 'government' | 'admin' | 'community_leader'
}

export function MessagingDashboard({ userId, userRole }: MessagingDashboardProps) {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('online')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const {
    channels,
    activeChannel,
    messages,
    notifications,
    typingUsers,
    onlineUsers,
    loading,
    sendMessage,
    joinChannel,
    leaveChannel,
    updatePresence,
    markAsRead
  } = useCommunication(userId)

  // Set active channel
  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId)
    joinChannel(channelId)
    markAsRead(channelId)
  }

  // Update user presence
  useEffect(() => {
    updatePresence(presenceStatus)
  }, [presenceStatus, updatePresence])

  // Auto-update presence based on activity
  useEffect(() => {
    let activityTimer: NodeJS.Timeout
    
    const updateActivity = () => {
      if (presenceStatus !== 'offline') {
        setPresenceStatus('online')
        updatePresence('online')
      }
    }

    const resetToAway = () => {
      if (presenceStatus === 'online') {
        setPresenceStatus('away')
        updatePresence('away')
      }
    }

    // Reset activity timer on user interaction
    const handleActivity = () => {
      updateActivity()
      clearTimeout(activityTimer)
      activityTimer = setTimeout(resetToAway, 300000) // 5 minutes
    }

    document.addEventListener('mousemove', handleActivity)
    document.addEventListener('keypress', handleActivity)
    document.addEventListener('click', handleActivity)

    return () => {
      document.removeEventListener('mousemove', handleActivity)
      document.removeEventListener('keypress', handleActivity)
      document.removeEventListener('click', handleActivity)
      clearTimeout(activityTimer)
    }
  }, [presenceStatus, updatePresence])

  // Calculate unread count
  const totalUnreadCount = channels.reduce((sum, channel) => sum + channel.unreadCount, 0)

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className={`${
        sidebarCollapsed ? 'w-16' : 'w-80'
      } bg-white/10 backdrop-blur-md border-r border-white/20 flex flex-col transition-all duration-300`}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/20">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-white">Messages</h1>
                <p className="text-sm text-white/60">{channels.length} channels</p>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Bell className="w-4 h-4 text-white" />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                      flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {notifications.filter(n => !n.isRead).length}
                      </span>
                    </div>
                  )}
                </button>

                {/* Settings */}
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Settings className="w-4 h-4 text-white" />
                </button>

                {/* Collapse */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 text-white transition-transform ${
                    sidebarCollapsed ? 'rotate-90' : '-rotate-90'
                  }`} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-white" />
              </button>
              
              {totalUnreadCount > 0 && (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <>
            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels or messages..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:border-blue-400/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Presence Status */}
            <div className="px-4 pb-4">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {userId.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
                    presenceStatus === 'online' ? 'bg-emerald-500' :
                    presenceStatus === 'away' ? 'bg-amber-500' :
                    presenceStatus === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                </div>
                
                <div className="flex-1">
                  <select
                    value={presenceStatus}
                    onChange={(e) => setPresenceStatus(e.target.value as PresenceStatus)}
                    className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="online" className="bg-gray-800">Online</option>
                    <option value="away" className="bg-gray-800">Away</option>
                    <option value="busy" className="bg-gray-800">Busy</option>
                    <option value="offline" className="bg-gray-800">Offline</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <button className="p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
                  rounded-lg transition-all duration-200 flex flex-col items-center">
                  <Plus className="w-4 h-4 text-blue-300 mb-1" />
                  <span className="text-xs text-blue-300">New Chat</span>
                </button>
                
                <button 
                  onClick={() => setShowVideoCall(true)}
                  className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 
                    rounded-lg transition-all duration-200 flex flex-col items-center"
                >
                  <Video className="w-4 h-4 text-emerald-300 mb-1" />
                  <span className="text-xs text-emerald-300">Video Call</span>
                </button>
                
                <button className="p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 
                  rounded-lg transition-all duration-200 flex flex-col items-center">
                  <Users className="w-4 h-4 text-purple-300 mb-1" />
                  <span className="text-xs text-purple-300">Group</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Channel List */}
        <div className="flex-1 overflow-hidden">
          <ChannelList
            channels={channels}
            activeChannelId={activeChannelId}
            onChannelSelect={handleChannelSelect}
            searchQuery={searchQuery}
            collapsed={sidebarCollapsed}
            userRole={userRole}
          />
        </div>

        {/* Online Users (if not collapsed) */}
        {!sidebarCollapsed && onlineUsers.length > 0 && (
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Online Now</span>
              <span className="text-xs text-white/60">{onlineUsers.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {onlineUsers.slice(0, 8).map((user) => (
                <div key={user.id} className="relative group">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                    ) : (
                      <span className="text-white text-xs font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full 
                    border-2 border-gray-900"></div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                    px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 
                    transition-opacity pointer-events-none whitespace-nowrap">
                    {user.name}
                  </div>
                </div>
              ))}
              {onlineUsers.length > 8 && (
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">+{onlineUsers.length - 8}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannelId && activeChannel ? (
          <ChatWindow
            channel={activeChannel}
            messages={messages}
            typingUsers={typingUsers}
            onSendMessage={sendMessage}
            userId={userId}
            userRole={userRole}
          />
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center bg-white/5">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Welcome to Indigenious Messaging
              </h2>
              <p className="text-white/60 mb-6 max-w-md">
                Secure, encrypted communication for Indigenous procurement collaboration.
                Select a channel to start messaging.
              </p>
              
              {/* Cultural Context */}
              <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4 max-w-lg mx-auto">
                <div className="flex items-center justify-center mb-2">
                  <Globe className="w-5 h-5 text-purple-400 mr-2" />
                  <span className="text-purple-200 font-medium">Cultural Communication Guidelines</span>
                </div>
                <p className="text-sm text-purple-100/80">
                  This platform respects Indigenous protocols and traditional ways of communication. 
                  All messages are encrypted and follow cultural sensitivity guidelines.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Call Modal */}
      <AnimatePresence>
        {showVideoCall && (
          <VideoCall
            channelId={activeChannelId}
            userId={userId}
            onClose={() => setShowVideoCall(false)}
          />
        )}
      </AnimatePresence>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifications && (
          <NotificationCenter
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
            userId={userId}
          />
        )}
      </AnimatePresence>

      {/* Security Indicator */}
      <div className="fixed bottom-4 right-4 bg-emerald-500/20 border border-emerald-400/50 
        rounded-lg px-3 py-2 flex items-center space-x-2">
        <Shield className="w-4 h-4 text-emerald-400" />
        <span className="text-emerald-300 text-sm font-medium">End-to-End Encrypted</span>
      </div>
    </div>
  )
}