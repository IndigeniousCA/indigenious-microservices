// Profile Dashboard Component
// Main profile management interface with comprehensive user information

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Settings, Shield, Bell, Eye, Edit3, Camera,
  Globe, Phone, Mail, MapPin, Building, Award,
  Calendar, Clock, Activity, Download, Upload,
  CheckCircle, AlertCircle, Info, Star, FileText
} from 'lucide-react'
import { useAuth } from './AuthenticationProvider'
import { BusinessProfile } from './BusinessProfile'
import { IndigenousVerification } from './IndigenousVerification'

interface ProfileDashboardProps {
  userId?: string
}

export function ProfileDashboard({ userId }: ProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'business' | 'indigenous' | 'settings' | 'security' | 'privacy'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  
  const { user, updateProfile, isLoading } = useAuth()

  // Calculate profile completion percentage
  useEffect(() => {
    if (!user) return

    const requiredFields = [
      'profile.firstName',
      'profile.lastName', 
      'email',
      'phone',
      'profile.businessProfile.legalName',
      'profile.businessProfile.description',
      'profile.businessProfile.serviceCategories',
      'profile.businessProfile.headquarters'
    ]

    const completedFields = requiredFields.filter(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], user)
      return value && (Array.isArray(value) ? value.length > 0 : true)
    })

    setProfileCompletion(Math.round((completedFields.length / requiredFields.length) * 100))
  }, [user])

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: User,
      description: 'Profile summary and quick actions'
    },
    {
      id: 'business',
      label: 'Business',
      icon: Building,
      description: 'Company information and capabilities',
      condition: () => user?.type?.includes('business')
    },
    {
      id: 'indigenous',
      label: 'Indigenous Identity',
      icon: Globe,
      description: 'Nation affiliation and verification',
      condition: () => user?.type === 'indigenous_business' || user?.indigenousIdentity
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Preferences and configuration'
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Password, MFA, and sessions'
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: Eye,
      description: 'Data sharing and consent'
    }
  ].filter(tab => !tab.condition || tab.condition())

  const getVerificationStatus = () => {
    if (!user) return 'unknown'
    
    switch (user.verificationStatus) {
      case 'approved':
        return 'verified'
      case 'pending':
        return 'pending'
      case 'in_review':
        return 'reviewing'
      case 'rejected':
        return 'rejected'
      default:
        return 'unverified'
    }
  }

  const getVerificationIcon = () => {
    const status = getVerificationStatus()
    
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'pending':
      case 'reviewing':
        return <Clock className="w-5 h-5 text-amber-400" />
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      default:
        return <Info className="w-5 h-5 text-white/40" />
    }
  }

  const getVerificationMessage = () => {
    const status = getVerificationStatus()
    
    switch (status) {
      case 'verified':
        return 'Your identity has been verified'
      case 'pending':
        return 'Verification documents submitted, awaiting review'
      case 'reviewing':
        return 'Documents under review by our verification team'
      case 'rejected':
        return 'Verification failed - please contact support'
      default:
        return 'Complete verification to access all features'
    }
  }

  const quickActions = [
    {
      title: 'Update Profile',
      description: 'Edit your personal information',
      icon: Edit3,
      action: () => setIsEditing(true),
      color: 'blue'
    },
    {
      title: 'Upload Documents',
      description: 'Add verification documents',
      icon: Upload,
      action: () => setActiveTab('indigenous'),
      color: 'emerald'
    },
    {
      title: 'Download Profile',
      description: 'Export your profile data',
      icon: Download,
      action: () => logger.info('Download profile'),
      color: 'purple'
    },
    {
      title: 'Privacy Settings',
      description: 'Manage data sharing',
      icon: Shield,
      action: () => setActiveTab('privacy'),
      color: 'amber'
    }
  ]

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full 
          mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full 
          mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <div className="relative">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 
                    rounded-full flex items-center justify-center text-2xl font-bold text-white">
                    {user.profile?.firstName?.charAt(0)}{user.profile?.lastName?.charAt(0)}
                  </div>
                  <button
                    onClick={() => setShowPhotoUpload(true)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 hover:bg-blue-600 
                      rounded-full flex items-center justify-center transition-colors"
                  >
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {user.profile?.displayName || `${user.profile?.firstName} ${user.profile?.lastName}`}
                  </h1>
                  <p className="text-white/60 capitalize">
                    {user.role?.replace('_', ' ')} • {user.type?.replace('_', ' ')}
                  </p>
                  
                  {/* Verification Status */}
                  <div className="flex items-center space-x-2 mt-2">
                    {getVerificationIcon()}
                    <span className="text-sm text-white/80">
                      {getVerificationMessage()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Completion */}
              <div className="text-right">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-sm text-white/60">Profile Completion</p>
                    <p className="text-2xl font-bold text-white">{profileCompletion}%</p>
                  </div>
                  <div className="w-16 h-16 relative">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="2"
                        strokeDasharray={`${profileCompletion}, 100`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white/60 text-sm">Member Since</p>
                    <p className="text-white font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-white/60 text-sm">Last Active</p>
                    <p className="text-white font-medium">
                      {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Today'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-white/60 text-sm">Security Level</p>
                    <p className="text-white font-medium">
                      {user.mfaEnabled ? 'High' : 'Standard'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white/60 text-sm">Status</p>
                    <p className="text-white font-medium capitalize">
                      {user.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="bg-white/5 border-b border-white/20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as unknown)}
                  className={`px-4 py-3 font-medium transition-all duration-200 flex items-center ${
                    activeTab === tab.id
                      ? 'text-white bg-white/10 border-b-2 border-blue-400'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Profile Incomplete Warning */}
                  {profileCompletion < 80 && (
                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-6">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                        <div>
                          <h3 className="font-semibold text-amber-200">
                            Complete Your Profile
                          </h3>
                          <p className="text-amber-100/80 text-sm mt-1">
                            Your profile is {profileCompletion}% complete. Complete your profile to access all platform features.
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 
                          rounded-lg text-amber-200 text-sm font-medium">
                          Complete Now
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, index) => (
                      <motion.button
                        key={action.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={action.action}
                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                          hover:bg-white/15 transition-all duration-200 text-left"
                      >
                        <div className={`p-3 rounded-lg bg-${action.color}-500/20 mb-4 inline-block`}>
                          <action.icon className={`w-6 h-6 text-${action.color}-400`} />
                        </div>
                        <h3 className="font-semibold text-white mb-2">{action.title}</h3>
                        <p className="text-sm text-white/60">{action.description}</p>
                      </motion.button>
                    ))}
                  </div>

                  {/* Profile Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2 text-blue-400" />
                        Personal Information
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-white/40" />
                          <div>
                            <p className="text-white text-sm">{user.email}</p>
                            <p className="text-white/60 text-xs">
                              {user.emailVerified ? 'Verified' : 'Unverified'}
                            </p>
                          </div>
                        </div>

                        {user.phone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="w-4 h-4 text-white/40" />
                            <div>
                              <p className="text-white text-sm">{user.phone}</p>
                              <p className="text-white/60 text-xs">
                                {user.phoneVerified ? 'Verified' : 'Unverified'}
                              </p>
                            </div>
                          </div>
                        )}

                        {user.profile?.businessProfile?.headquarters && (
                          <div className="flex items-center space-x-3">
                            <MapPin className="w-4 h-4 text-white/40" />
                            <div>
                              <p className="text-white text-sm">
                                {user.profile.businessProfile.headquarters.city}, {user.profile.businessProfile.headquarters.province}
                              </p>
                              <p className="text-white/60 text-xs">Primary Location</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Business Information */}
                    {user.profile?.businessProfile && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <Building className="w-5 h-5 mr-2 text-emerald-400" />
                          Business Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-white font-medium">
                              {user.profile.businessProfile.legalName}
                            </p>
                            <p className="text-white/60 text-sm capitalize">
                              {user.profile.businessProfile.businessType}
                            </p>
                          </div>

                          {user.profile.businessProfile.serviceCategories && (
                            <div>
                              <p className="text-white/60 text-xs mb-2">Service Categories</p>
                              <div className="flex flex-wrap gap-2">
                                {user.profile.businessProfile.serviceCategories.slice(0, 3).map((category, index) => (
                                  <span key={index} className="px-2 py-1 bg-emerald-500/20 
                                    text-emerald-300 text-xs rounded">
                                    {category}
                                  </span>
                                ))}
                                {user.profile.businessProfile.serviceCategories.length > 3 && (
                                  <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded">
                                    +{user.profile.businessProfile.serviceCategories.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-purple-400" />
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm">Profile updated</p>
                          <p className="text-white/60 text-xs">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm">Verification documents uploaded</p>
                          <p className="text-white/60 text-xs">1 day ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm">Account created</p>
                          <p className="text-white/60 text-xs">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'business' && user.profile?.businessProfile && (
                <BusinessProfile 
                  businessProfile={user.profile.businessProfile}
                  onUpdate={(data) => updateProfile({ businessProfile: data })}
                  isEditable={true}
                />
              )}

              {activeTab === 'indigenous' && (
                <IndigenousVerification
                  user={user}
                  onUpdate={(data) => updateProfile({ indigenousIdentity: data })}
                />
              )}

              {(activeTab === 'settings' || activeTab === 'security' || activeTab === 'privacy') && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {tabs.find(t => t.id === activeTab)?.label} Settings
                  </h3>
                  <p className="text-white/60">
                    This section is under development and will be available soon.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Cultural Acknowledgment */}
        <div className="fixed bottom-4 right-4 bg-purple-500/10 border border-purple-400/30 
          rounded-lg px-3 py-2 max-w-xs">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 text-xs">
              Profile managed with Indigenous data sovereignty principles
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}