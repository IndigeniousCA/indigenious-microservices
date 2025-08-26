// Gated Business Directory/Marketplace
// Must be registered to browse - strict access control

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { 
  Search, Filter, MapPin, Shield, Star, Users, 
  Briefcase, ChevronRight, Lock, MessageCircle, 
  CheckCircle, AlertCircle, TrendingUp
} from 'lucide-react'

// Glass UI Components matching our theme
const GlassPanel = ({ children, className = '', glow = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`bg-white/10 backdrop-blur-md border rounded-2xl p-6
      ${glow ? 'border-blue-400/50 shadow-lg shadow-blue-500/20' : 'border-white/20'}
      ${className}`}
  >
    {children}
  </motion.div>
)

// Business Card Component
const BusinessCard = ({ business, onContact, onViewDetails }) => {
  const verificationColors = {
    verified: 'text-emerald-400 border-emerald-400/50 bg-emerald-500/10',
    pending: 'text-amber-400 border-amber-400/50 bg-amber-500/10',
    unverified: 'text-gray-400 border-gray-400/50 bg-gray-500/10',
  }

  const getIndustryIcon = (industry) => {
    const icons = {
      mining: '⛏️',
      construction: '🏗️',
      energy: '⚡',
      forestry: '🌲',
      transportation: '🚛',
      technology: '💻',
      professional: '💼',
      manufacturing: '🏭',
    }
    return icons[industry] || '🏢'
  }

  return (
    <GlassPanel glow={business.featured}>
      {/* Verification Badge */}
      <div className="flex justify-between items-start mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium
          ${verificationColors[business.verificationStatus]}`}>
          {business.verificationStatus === 'verified' && <CheckCircle className="w-4 h-4 mr-1" />}
          {business.verificationStatus === 'pending' && <AlertCircle className="w-4 h-4 mr-1" />}
          {business.verificationStatus === 'verified' ? 'Verified' : 
           business.verificationStatus === 'pending' ? 'Pending' : 'Unverified'}
        </div>
        
        {business.indigenousOwnership >= 51 && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
            {business.indigenousOwnership}% Indigenous
          </div>
        )}
      </div>

      {/* Business Info */}
      <h3 className="text-xl font-semibold text-white mb-2">{business.businessName}</h3>
      
      <div className="flex items-center text-sm text-white/60 mb-3">
        <MapPin className="w-4 h-4 mr-1" />
        {business.communityAffiliation.primaryNation}, {business.communityAffiliation.territory}
      </div>

      {/* Industries */}
      <div className="flex flex-wrap gap-2 mb-4">
        {business.industries.slice(0, 3).map(industry => (
          <span key={industry} className="text-sm bg-white/10 px-2 py-1 rounded-lg">
            {getIndustryIcon(industry)} {industry}
          </span>
        ))}
        {business.industries.length > 3 && (
          <span className="text-sm text-white/50">+{business.industries.length - 3} more</span>
        )}
      </div>

      {/* Workforce & Capabilities */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-white/60 text-xs">Workforce</div>
          <div className="text-white font-medium">{business.workforceSize}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-white/60 text-xs">Active Projects</div>
          <div className="text-white font-medium">{business.activeProjects || 0}</div>
        </div>
      </div>

      {/* Key Capabilities */}
      {business.keyCapabilities && (
        <div className="mb-4">
          <div className="text-xs text-white/60 mb-1">Key Capabilities:</div>
          <div className="flex flex-wrap gap-1">
            {business.keyCapabilities.slice(0, 3).map(cap => (
              <span key={cap} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewDetails(business)}
          className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
            rounded-lg text-white text-sm font-medium transition-all duration-200"
        >
          View Details
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onContact(business)}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
            rounded-lg text-blue-100 transition-all duration-200"
        >
          <MessageCircle className="w-4 h-4" />
        </motion.button>
      </div>
    </GlassPanel>
  )
}

// Main Directory Component
export function BusinessDirectory() {
  const [businesses, setBusinesses] = useState([])
  const [filteredBusinesses, setFilteredBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    industries: [],
    verificationStatus: 'all',
    indigenousOwnership: 0,
    location: '',
    sortBy: 'relevance',
  })
  const [showFilters, setShowFilters] = useState(false)
  
  const supabase = useSupabaseClient()
  const user = useUser()

  // Check if user has access
  const [hasAccess, setHasAccess] = useState(false)
  const [accessLevel, setAccessLevel] = useState('none')

  useEffect(() => {
    checkUserAccess()
    if (hasAccess) {
      loadBusinesses()
    }
  }, [user])

  const checkUserAccess = async () => {
    if (!user) {
      setHasAccess(false)
      return
    }

    // Check user's business profile and access level
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('verification_status, subscription_tier, is_indigenous')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setHasAccess(true)
      setAccessLevel(
        profile.verification_status === 'verified' ? 'full' :
        profile.verification_status === 'pending' ? 'limited' : 'basic'
      )
    }
  }

  const loadBusinesses = async () => {
    setLoading(true)
    try {
      // Load businesses based on access level
      let query = supabase
        .from('indigenous_businesses')
        .select(`
          *,
          workforce_capacity (
            certified_trades,
            total_employees,
            indigenous_employees
          ),
          certifications (
            certification_type,
            valid_until
          )
        `)

      // Apply access level restrictions
      if (accessLevel === 'basic') {
        query = query.limit(10)
      } else if (accessLevel === 'limited') {
        query = query.limit(50)
      }

      const { data, error } = await query

      if (error) throw error
      setBusinesses(data || [])
      setFilteredBusinesses(data || [])
    } catch (error) {
      logger.error('Error loading businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...businesses]

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(b => 
        b.businessName.toLowerCase().includes(filters.search.toLowerCase()) ||
        b.description?.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Industry filter
    if (filters.industries.length > 0) {
      filtered = filtered.filter(b => 
        filters.industries.some(ind => b.industries?.includes(ind))
      )
    }

    // Verification filter
    if (filters.verificationStatus !== 'all') {
      filtered = filtered.filter(b => b.verificationStatus === filters.verificationStatus)
    }

    // Indigenous ownership filter
    if (filters.indigenousOwnership > 0) {
      filtered = filtered.filter(b => b.indigenousOwnership >= filters.indigenousOwnership)
    }

    // Sort
    if (filters.sortBy === 'relevance') {
      // AI-powered relevance sorting would go here
      filtered.sort((a, b) => b.matchScore - a.matchScore)
    } else if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    setFilteredBusinesses(filtered)
  }, [filters, businesses])

  // No access view
  if (!user || !hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <GlassPanel className="text-center py-20">
            <Lock className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">
              This Directory is Members Only
            </h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Register your business to access our verified network of Indigenous and Canadian businesses
            </p>
            <div className="flex gap-4 justify-center">
              <motion.a
                href="/register"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
                  rounded-xl text-blue-100 font-medium transition-all duration-200"
              >
                Register Your Business
              </motion.a>
              <motion.a
                href="/login"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 
                  rounded-xl text-white font-medium transition-all duration-200"
              >
                Sign In
              </motion.a>
            </div>
          </GlassPanel>
        </div>
      </div>
    )
  }

  const handleContact = (business) => {
    // Open chat modal or navigate to chat
    logger.info('Contact business:', business)
  }

  const handleViewDetails = (business) => {
    // Navigate to detailed profile
    window.location.href = `/business/${business.id}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Indigenous Business Network
          </h1>
          <p className="text-lg text-white/60">
            {filteredBusinesses.length} verified businesses ready to partner
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Search businesses, capabilities, or locations..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl
                  backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
                  focus:outline-none transition-all duration-200"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-4 rounded-xl backdrop-blur-md border transition-all duration-200
                ${showFilters 
                  ? 'bg-blue-500/20 border-blue-400/50 text-blue-100' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
            >
              <Filter className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GlassPanel className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Industries */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Industries</label>
                      <select 
                        multiple
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value)
                          setFilters(prev => ({ ...prev, industries: selected }))
                        }}
                      >
                        <option value="mining">Mining</option>
                        <option value="construction">Construction</option>
                        <option value="energy">Energy</option>
                        <option value="forestry">Forestry</option>
                        <option value="technology">Technology</option>
                      </select>
                    </div>

                    {/* Verification Status */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Verification</label>
                      <select 
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        value={filters.verificationStatus}
                        onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                      >
                        <option value="all">All</option>
                        <option value="verified">Verified Only</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>

                    {/* Indigenous Ownership */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Min. Indigenous Ownership
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={filters.indigenousOwnership}
                        onChange={(e) => setFilters(prev => ({ ...prev, indigenousOwnership: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="text-center text-white/60 text-sm">{filters.indigenousOwnership}%</div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Sort By</label>
                      <select 
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                      >
                        <option value="relevance">Relevance</option>
                        <option value="newest">Newest First</option>
                        <option value="rating">Highest Rated</option>
                      </select>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Access Level Notice */}
        {accessLevel !== 'full' && (
          <div className="mb-6 bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm text-amber-100">
                  {accessLevel === 'basic' 
                    ? 'You have limited access. Complete verification to see all businesses.' 
                    : 'Your verification is pending. You can browse but cannot contact businesses yet.'}
                </p>
              </div>
              <a href="/verify" className="text-sm text-amber-300 hover:text-amber-200">
                Complete Verification →
              </a>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white/60 mt-4">Loading businesses...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map(business => (
              <BusinessCard
                key={business.id}
                business={business}
                onContact={handleContact}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBusinesses.length === 0 && (
          <GlassPanel className="text-center py-20">
            <p className="text-white/60">No businesses match your filters. Try adjusting your search.</p>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}