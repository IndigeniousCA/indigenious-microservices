// Admin Dashboard Component
// Main administrative control center for platform management

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, Users, FileText, Settings, AlertTriangle, CheckCircle,
  Activity, TrendingUp, Clock, Bell, Search, Filter, RefreshCw,
  Database, Lock, Globe, Headphones, BarChart3, Calendar,
  Flag, Zap, Eye, Download, Upload, Monitor, Cpu
} from 'lucide-react'
// TODO: Import these components when they are created
// import { SystemHealthMonitor } from './SystemHealthMonitor'
// import { UserManagement } from './UserManagement'
// import { ContentModeration } from './ContentModeration'
// import { ComplianceMonitor } from './ComplianceMonitor'
// import { PlatformAnalytics } from './PlatformAnalytics'
// import { SupportTickets } from './SupportTickets'
// import { SecurityIncidents } from './SecurityIncidents'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import type { AdminUser, AdminRole } from '../types/admin.types'

interface AdminDashboardProps {
  adminUser: AdminUser
}

export function AdminDashboard({ adminUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'compliance' | 'analytics' | 'support' | 'security' | 'system'>('overview')
  const [showEmergencyMode, setShowEmergencyMode] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  
  const {
    dashboardData,
    systemHealth,
    pendingActions,
    criticalAlerts,
    loading,
    refreshData,
    handleEmergencyAction
  } = useAdminDashboard(adminUser.id)

  // Auto-refresh every 30 seconds for critical data
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'overview' || activeTab === 'system') {
        refreshData()
        setLastRefresh(new Date())
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [activeTab, refreshData])

  // Navigation tabs with role-based access
  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Monitor, 
      accessible: true,
      badge: criticalAlerts.length > 0 ? criticalAlerts.length : undefined
    },
    { 
      id: 'users', 
      label: 'Users', 
      icon: Users, 
      accessible: adminUser.permissions.canManageUsers,
      badge: dashboardData?.pendingVerifications || undefined
    },
    { 
      id: 'content', 
      label: 'Content', 
      icon: FileText, 
      accessible: adminUser.permissions.canModerateContent,
      badge: dashboardData?.flaggedContent || undefined
    },
    { 
      id: 'compliance', 
      label: 'Compliance', 
      icon: Shield, 
      accessible: adminUser.permissions.canManageCompliance,
      badge: dashboardData?.complianceIssues || undefined
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      accessible: adminUser.permissions.canViewAnalytics
    },
    { 
      id: 'support', 
      label: 'Support', 
      icon: Headphones, 
      accessible: adminUser.permissions.canHandleSupport,
      badge: dashboardData?.openTickets || undefined
    },
    { 
      id: 'security', 
      label: 'Security', 
      icon: Lock, 
      accessible: adminUser.permissions.canAccessAuditLogs,
      badge: dashboardData?.securityIncidents || undefined
    },
    { 
      id: 'system', 
      label: 'System', 
      icon: Settings, 
      accessible: adminUser.permissions.canManageSystem
    }
  ].filter(tab => tab.accessible)

  // Quick action cards
  const quickActions = [
    {
      title: 'Verify Business',
      description: 'Review pending Indigenous business verifications',
      icon: CheckCircle,
      action: () => setActiveTab('users'),
      count: dashboardData?.pendingVerifications || 0,
      color: 'blue',
      accessible: adminUser.permissions.canVerifyBusinesses
    },
    {
      title: 'Review Content',
      description: 'Moderate flagged content and reports',
      icon: Flag,
      action: () => setActiveTab('content'),
      count: dashboardData?.flaggedContent || 0,
      color: 'amber',
      accessible: adminUser.permissions.canModerateContent
    },
    {
      title: 'Handle Tickets',
      description: 'Respond to user support requests',
      icon: Headphones,
      action: () => setActiveTab('support'),
      count: dashboardData?.openTickets || 0,
      color: 'emerald',
      accessible: adminUser.permissions.canHandleSupport
    },
    {
      title: 'Security Review',
      description: 'Investigate security incidents',
      icon: AlertTriangle,
      action: () => setActiveTab('security'),
      count: dashboardData?.securityIncidents || 0,
      color: 'red',
      accessible: adminUser.permissions.canAccessAuditLogs
    }
  ].filter(action => action.accessible)

  // Get role-specific welcome message
  const getWelcomeMessage = () => {
    switch (adminUser.role) {
      case 'super_admin':
        return 'Complete platform oversight and control'
      case 'admin':
        return 'System administration and user management'
      case 'moderator':
        return 'Content moderation and community oversight'
      case 'compliance_officer':
        return 'Regulatory compliance and audit management'
      case 'community_liaison':
        return 'Indigenous community relations and protocols'
      case 'support_specialist':
        return 'User assistance and technical support'
      default:
        return 'Platform administration and management'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Emergency Mode Banner */}
      <AnimatePresence>
        {showEmergencyMode && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-red-600 text-white p-4 text-center"
          >
            <div className="flex items-center justify-center space-x-3">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-semibold">EMERGENCY MODE ACTIVATED</span>
              <button
                onClick={() => setShowEmergencyMode(false)}
                className="ml-4 px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-sm"
              >
                Deactivate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-white/60 mt-1">{getWelcomeMessage()}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* System Health Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                systemHealth.status === 'healthy' ? 'bg-emerald-500' :
                systemHealth.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-white/80">
                System {systemHealth.status}
              </span>
            </div>

            {/* Critical Alerts */}
            {criticalAlerts.length > 0 && (
              <button className="relative p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                  flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {criticalAlerts.length}
                  </span>
                </div>
              </button>
            )}

            {/* Emergency Mode */}
            {adminUser.permissions.canAccessEmergencyMode && (
              <button
                onClick={() => setShowEmergencyMode(true)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border 
                  border-red-400/50 rounded-lg text-red-100 text-sm font-medium 
                  transition-all duration-200 flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                Emergency
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={() => {
                refreshData()
                setLastRefresh(new Date())
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5 text-white/60" />
            </button>

            {/* Admin Profile */}
            <div className="flex items-center space-x-3 bg-white/5 rounded-lg px-3 py-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {adminUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{adminUser.name}</p>
                <p className="text-xs text-white/60 capitalize">
                  {adminUser.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Last Update Indicator */}
        <div className="mt-4 flex items-center justify-between text-xs text-white/40">
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <span>Session: {adminUser.name} ({adminUser.role})</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white/5 border-b border-white/20 px-6">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-4 py-3 font-medium transition-all duration-200 
                flex items-center ${
                activeTab === tab.id
                  ? 'text-white bg-white/10 border-b-2 border-blue-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.badge && (
                <div className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {tab.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Critical Alerts */}
                {criticalAlerts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-400/30 rounded-xl p-6"
                  >
                    <h3 className="text-lg font-semibold text-red-200 mb-4 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Critical Alerts ({criticalAlerts.length})
                    </h3>
                    <div className="space-y-3">
                      {criticalAlerts.slice(0, 3).map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 
                          bg-red-900/20 rounded-lg">
                          <div>
                            <p className="font-medium text-red-200">{alert.title}</p>
                            <p className="text-sm text-red-100/80">{alert.message}</p>
                          </div>
                          <button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 
                            rounded text-red-200 text-sm">
                            Investigate
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={action.action}
                      className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                        cursor-pointer hover:bg-white/15 transition-all duration-200`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg bg-${action.color}-500/20`}>
                          <action.icon className={`w-6 h-6 text-${action.color}-400`} />
                        </div>
                        {action.count > 0 && (
                          <div className={`px-3 py-1 bg-${action.color}-500/20 text-${action.color}-300 
                            rounded-full text-sm font-medium`}>
                            {action.count}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white mb-2">{action.title}</h3>
                      <p className="text-sm text-white/60">{action.description}</p>
                    </motion.div>
                  ))}
                </div>

                {/* System Health Overview */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <p className="text-white">System Health Monitor component to be implemented</p>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-400" />
                      Recent Actions
                    </h3>
                    <div className="space-y-3">
                      {pendingActions.slice(0, 5).map((action, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 
                          bg-white/5 rounded-lg">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm text-white">{action.action} - {action.targetName || action.targetId}</p>
                            <p className="text-xs text-white/60">{action.createdAt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
                      Platform Stats
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-white/60">Total Users</span>
                        <span className="text-white font-medium">
                          {dashboardData?.totalUsers?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Active RFQs</span>
                        <span className="text-white font-medium">
                          {dashboardData?.activeRFQs || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">System Uptime</span>
                        <span className="text-emerald-400 font-medium">
                          {dashboardData?.systemUptime || '99.9%'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Response Time</span>
                        <span className="text-white font-medium">
                          {dashboardData?.avgResponseTime || '120ms'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <p className="text-white">User Management component to be implemented</p>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <p className="text-white">Content Moderation component to be implemented</p>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <p className="text-white">Compliance Monitor component to be implemented</p>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <p className="text-white">Platform Analytics component to be implemented</p>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <p className="text-white">Support Tickets component to be implemented</p>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <p className="text-white">Security Incidents component to be implemented</p>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <p className="text-white">System Health Monitor component to be implemented</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Cultural Acknowledgment */}
      <div className="fixed bottom-4 left-4 bg-purple-500/10 border border-purple-400/30 
        rounded-lg px-3 py-2 max-w-xs">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-purple-200 text-xs">
            Administered with respect for Indigenous data sovereignty
          </span>
        </div>
      </div>
    </div>
  )
}