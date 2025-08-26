'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Briefcase, Filter, Search, Star, Clock, MapPin, 
  DollarSign, Shield, Award, Users, ChevronRight,
  Building, Gavel, Calculator, Banknote, Trees,
  HardHat, Lightbulb, Globe, TrendingUp, Heart,
  AlertCircle, CheckCircle, Info, Zap, Brain,
  Sparkles, Target, ArrowRight, BarChart3
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { toast } from 'sonner'
import type { ServiceCategory, Province } from '../types'
import { 
  ProfessionalMarketplaceService, 
  ProfessionalRecommendation,
  MarketIntelligence 
} from '../services/ProfessionalMarketplaceService'
import type { UniversalBusinessRequest } from '@/features/universal-request-engine/types'
import { useUser } from '@/contexts/user-context'

// Professional categories with icons
const PROFESSIONAL_CATEGORIES = [
  { id: 'Legal', name: 'Legal Services', icon: Gavel, color: 'blue' },
  { id: 'Financial', name: 'Financial Services', icon: Calculator, color: 'green' },
  { id: 'Technical', name: 'Technical Services', icon: Lightbulb, color: 'purple' },
  { id: 'Construction', name: 'Construction', icon: HardHat, color: 'orange' },
  { id: 'Environmental', name: 'Environmental', icon: Trees, color: 'emerald' },
  { id: 'Cultural', name: 'Cultural Services', icon: Heart, color: 'red' },
  { id: 'Management', name: 'Management', icon: Building, color: 'indigo' },
  { id: 'Consulting', name: 'Consulting', icon: Users, color: 'cyan' },
]

// Mock data for demonstration
const mockProfessionals = [
  {
    id: '1',
    name: 'Eagle Legal Services',
    category: ['Legal'],
    specializations: ['Partnership Formation', 'Indigenous Law', 'Contract Review'],
    indigenousOwned: true,
    rating: 4.9,
    completedJobs: 127,
    responseTime: 2,
    location: 'Toronto, ON',
    pricing: {
      model: 'Fixed',
      lpFormation: 8500,
      marketRate: 15000,
      savings: '43%'
    },
    certifications: ['Law Society of Ontario', 'CCAB Certified'],
    languages: ['English', 'French', 'Ojibwe'],
    description: 'Specializing in Indigenous business law with 15+ years experience',
  },
  {
    id: '2',
    name: 'Northern Accounting Partners',
    category: ['Financial'],
    specializations: ['Tax Planning', 'Financial Statements', 'Grant Applications'],
    indigenousOwned: true,
    rating: 4.8,
    completedJobs: 89,
    responseTime: 4,
    location: 'Winnipeg, MB',
    pricing: {
      model: 'Hourly',
      rate: 125,
      marketRate: 200,
      savings: '38%'
    },
    certifications: ['CPA Canada', 'Indigenous Business Certified'],
    languages: ['English', 'Cree'],
    description: 'Your trusted partner for Indigenous business financial success',
  },
  {
    id: '3',
    name: 'TechBridge Solutions',
    category: ['Technical'],
    specializations: ['Software Development', 'IT Infrastructure', 'Cybersecurity'],
    indigenousOwned: false,
    rating: 4.7,
    completedJobs: 156,
    responseTime: 6,
    location: 'Vancouver, BC',
    pricing: {
      model: 'Project',
      averageProject: 25000,
      marketRate: 35000,
      savings: '29%'
    },
    certifications: ['Microsoft Partner', 'AWS Certified'],
    languages: ['English', 'Mandarin'],
    indigenousPartnership: true,
    description: 'Partnered with 12 Indigenous tech firms for community projects',
  },
]

interface ProfessionalMarketplaceProps {
  requestType?: string;
  requirements?: any;
  onSelectProfessional?: (professional: unknown) => void;
}

export function ProfessionalMarketplace({ 
  requestType,
  requirements,
  onSelectProfessional 
}: ProfessionalMarketplaceProps) {
  const { user } = useUser()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState<unknown>(null)
  const [compareList, setCompareList] = useState<string[]>([])
  const [priceTransparency, setPriceTransparency] = useState(true)
  
  // AI Service
  const [marketplaceService] = useState(() => new ProfessionalMarketplaceService())
  const [aiRecommendations, setAiRecommendations] = useState<ProfessionalRecommendation[]>([])
  const [aiMarketIntelligence, setAiMarketIntelligence] = useState<MarketIntelligence | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [showAIInsights, setShowAIInsights] = useState(true)
  
  // Filters
  const [filters, setFilters] = useState({
    indigenousOwned: false,
    maxPrice: 50000,
    minRating: 4.0,
    location: 'all',
    certificationRequired: false,
  })

  // Market intelligence
  const [marketData, setMarketData] = useState({
    averagePrice: 12500,
    averageTime: 21,
    totalProviders: 234,
    trend: -2.3,
  })

  useEffect(() => {
    // Load AI recommendations when request changes
    const loadAIRecommendations = async () => {
      if (!requestType || !user?.id) return
      
      setIsLoadingAI(true)
      try {
        // Get AI recommendations
        const mockRequest: Partial<UniversalBusinessRequest> = {
          request: {
            type: 'Professional',
            subType: requestType,
            title: `Looking for ${requestType} services`,
            urgency: 'standard',
            visibility: 'public',
            confidential: false
          },
          budget: {
            type: 'Range',
            range: { min: 5000, max: filters.maxPrice },
            currency: 'CAD'
          },
          timeline: {
            startDate: new Date(),
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            flexibleDates: true
          },
          location: {
            primary: {
              country: 'Canada',
              province: 'Ontario',
              city: 'Toronto'
            },
            acceptRemote: true
          },
          indigenousRequirements: filters.indigenousOwned ? {
            indigenousOwnedRequired: true,
            targetNations: []
          } : undefined
        }
        
        const recommendations = await marketplaceService.getAIRecommendations(
          mockRequest,
          user.id,
          user.businessId
        )
        
        setAiRecommendations(recommendations)
        
        // Get market intelligence
        const intelligence = await marketplaceService.getMarketIntelligence(
          requestType,
          filters.location === 'all' ? undefined : filters.location
        )
        
        setAiMarketIntelligence(intelligence)
        setMarketData({
          averagePrice: intelligence.averagePrice,
          averageTime: intelligence.averageTimeline,
          totalProviders: intelligence.totalProviders,
          trend: intelligence.priceTrend
        })
      } catch (error) {
        logger.error('Error loading AI recommendations:', error)
      } finally {
        setIsLoadingAI(false)
      }
    }
    
    loadAIRecommendations()
  }, [requestType, filters, marketplaceService, user])

  const filteredProfessionals = mockProfessionals.filter(prof => {
    if (selectedCategory !== 'all' && !prof.category.includes(selectedCategory)) return false
    if (searchQuery && !prof.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filters.indigenousOwned && !prof.indigenousOwned) return false
    if (filters.minRating && prof.rating < filters.minRating) return false
    return true
  })

  const handleCompare = (professionalId: string) => {
    if (compareList.includes(professionalId)) {
      setCompareList(compareList.filter(id => id !== professionalId))
    } else if (compareList.length < 3) {
      setCompareList([...compareList, professionalId])
    } else {
      toast.error('You can compare up to 3 professionals at a time')
    }
  }

  const renderMarketIntelligence = () => (
    <GlassPanel className="p-6 mb-6 relative overflow-hidden">
      {aiMarketIntelligence && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Brain className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-blue-400">AI-Powered Analysis</span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Market Intelligence
        </h3>
        <span className="text-xs text-white/60">
          Based on {marketData.totalProviders} providers
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            ${marketData.averagePrice.toLocaleString()}
          </p>
          <p className="text-sm text-white/60">Average Price</p>
          <p className="text-xs text-green-400">
            ↓ {Math.abs(marketData.trend)}% this month
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {marketData.averageTime} days
          </p>
          <p className="text-sm text-white/60">Average Timeline</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {marketData.totalProviders}
          </p>
          <p className="text-sm text-white/60">Available Providers</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {aiMarketIntelligence 
              ? Math.round(aiMarketIntelligence.indigenousProviders / aiMarketIntelligence.totalProviders * 100)
              : 35}%
          </p>
          <p className="text-sm text-white/60">Indigenous-Owned</p>
        </div>
      </div>
      
      {/* AI Market Insights */}
      {aiMarketIntelligence && aiMarketIntelligence.insights.length > 0 && (
        <div className="mt-4 space-y-2">
          {aiMarketIntelligence.insights.slice(0, 2).map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border ${
                insight.type === 'opportunity' 
                  ? 'bg-green-500/10 border-green-400/30' 
                  : insight.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-400/30'
                  : 'bg-blue-500/10 border-blue-400/30'
              }`}
            >
              <div className="flex items-start gap-2">
                <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  insight.type === 'opportunity' ? 'text-green-400' :
                  insight.type === 'warning' ? 'text-amber-400' :
                  'text-blue-400'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    insight.type === 'opportunity' ? 'text-green-300' :
                    insight.type === 'warning' ? 'text-amber-300' :
                    'text-blue-300'
                  }`}>
                    {insight.title}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">{insight.description}</p>
                  {insight.action && (
                    <button className="text-xs text-white/80 hover:text-white mt-1 flex items-center gap-1">
                      {insight.action}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {priceTransparency && !aiMarketIntelligence && (
        <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-400/30">
          <p className="text-sm text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Price transparency has reduced costs by 23% in the last 6 months. 
              Providers are competing on value, not information asymmetry.
            </span>
          </p>
        </div>
      )}
    </GlassPanel>
  )

  const renderProfessionalCard = (professional: any, aiRecommendation?: ProfessionalRecommendation) => {
    const isInCompare = compareList.includes(professional.id)
    const savings = professional.pricing.savings
    const hasAIMatch = aiRecommendation && aiRecommendation.matchScore
    
    return (
      <motion.div
        key={professional.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <GlassPanel className="p-6 hover:bg-white/10 transition-all">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-white">
                  {professional.name}
                </h3>
                {professional.indigenousOwned && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Indigenous Owned
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60">{professional.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-medium">{professional.rating}</span>
            </div>
          </div>
          
          {/* Specializations */}
          <div className="flex flex-wrap gap-2 mb-4">
            {professional.specializations.map((spec: string) => (
              <span key={spec} className="px-2 py-1 bg-white/10 text-xs text-white/80 rounded">
                {spec}
              </span>
            ))}
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div>
              <p className="text-white/60">Completed</p>
              <p className="text-white font-medium">{professional.completedJobs} jobs</p>
            </div>
            <div>
              <p className="text-white/60">Response</p>
              <p className="text-white font-medium">{professional.responseTime}h avg</p>
            </div>
            <div>
              <p className="text-white/60">Location</p>
              <p className="text-white font-medium">{professional.location}</p>
            </div>
          </div>
          
          {/* Pricing with Transparency */}
          <div className="p-4 bg-white/5 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Pricing</span>
              <span className="text-xs text-green-400">
                Save {savings} vs market rate
              </span>
            </div>
            {professional.pricing.model === 'Fixed' && (
              <div>
                <p className="text-xl font-bold text-white">
                  ${professional.pricing.lpFormation.toLocaleString()}
                </p>
                <p className="text-xs text-white/50 line-through">
                  Market rate: ${professional.pricing.marketRate.toLocaleString()}
                </p>
              </div>
            )}
            {professional.pricing.model === 'Hourly' && (
              <div>
                <p className="text-xl font-bold text-white">
                  ${professional.pricing.rate}/hour
                </p>
                <p className="text-xs text-white/50 line-through">
                  Market rate: ${professional.pricing.marketRate}/hour
                </p>
              </div>
            )}
          </div>
          
          {/* Certifications & Languages */}
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-white/80">
                {professional.certifications.join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-white/80">
                {professional.languages.join(', ')}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <GlassButton
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => setSelectedProfessional(professional)}
            >
              View Details
            </GlassButton>
            <GlassButton
              variant={isInCompare ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleCompare(professional.id)}
            >
              {isInCompare ? <CheckCircle className="w-4 h-4" /> : 'Compare'}
            </GlassButton>
          </div>
          
          {/* AI Match Score */}
          {hasAIMatch && (
            <div className="absolute -top-2 -right-2">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-400/30">
                  <div className="text-center">
                    <span className="text-lg font-bold text-blue-300">
                      {aiRecommendation.matchScore.overall}%
                    </span>
                    <p className="text-[8px] text-blue-400 -mt-1">AI Match</p>
                  </div>
                </div>
                <Brain className="w-4 h-4 text-blue-400 absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5" />
              </div>
            </div>
          )}
          
          {/* AI Insights */}
          {hasAIMatch && aiRecommendation.matchScore.reasons.length > 0 && (
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-400/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">AI Analysis</span>
              </div>
              <ul className="space-y-1">
                {aiRecommendation.matchScore.reasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="text-xs text-white/70 flex items-start gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              {aiRecommendation.bundleOpportunities && aiRecommendation.bundleOpportunities.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-xs text-amber-300 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Bundle & save {aiRecommendation.bundleOpportunities[0].savingsPercent}%
                  </p>
                </div>
              )}
            </div>
          )}
        </GlassPanel>
      </motion.div>
    )
  }

  const renderComparisonView = () => {
    if (compareList.length === 0) return null
    
    const professionals = compareList.map(id => 
      mockProfessionals.find(p => p.id === id)
    ).filter(Boolean)
    
    return (
      <GlassPanel className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Comparison View
          </h3>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setCompareList([])}
          >
            Clear
          </GlassButton>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {professionals.map(prof => (
            <div key={prof!.id} className="space-y-3">
              <h4 className="font-medium text-white">{prof!.name}</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Price</span>
                  <span className="text-white font-medium">
                    ${prof!.pricing.lpFormation || prof!.pricing.rate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Rating</span>
                  <span className="text-white font-medium">{prof!.rating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Experience</span>
                  <span className="text-white font-medium">{prof!.completedJobs} jobs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Response</span>
                  <span className="text-white font-medium">{prof!.responseTime}h</span>
                </div>
              </div>
              
              <GlassButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => onSelectProfessional?.(prof)}
              >
                Select
              </GlassButton>
            </div>
          ))}
        </div>
      </GlassPanel>
    )
  }

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoadingAI && (
        <div className="mb-6">
          <GlassPanel className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-400/20 animate-pulse" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-blue-400 animate-spin" />
                <Brain className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">AI is analyzing the market</p>
                <p className="text-sm text-white/60 mt-1">Finding the best professionals for your needs...</p>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
      
      {/* Market Intelligence */}
      {!isLoadingAI && renderMarketIntelligence()}
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <GlassInput
            placeholder="Search professionals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <GlassButton
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </GlassButton>
      </div>
      
      {/* Category Pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg transition-all ${
            selectedCategory === 'all'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          All Categories
        </button>
        {PROFESSIONAL_CATEGORIES.map(category => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                selectedCategory === category.id
                  ? `bg-${category.color}-500/20 text-${category.color}-300 border border-${category.color}-400/50`
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {category.name}
            </button>
          )
        })}
      </div>
      
      {/* Comparison View */}
      {renderComparisonView()}
      
      {/* AI Recommendations Section */}
      {aiRecommendations.length > 0 && showAIInsights && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              AI-Recommended Professionals
            </h3>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setShowAIInsights(!showAIInsights)}
            >
              {showAIInsights ? 'Hide' : 'Show'} AI Insights
            </GlassButton>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiRecommendations.slice(0, 4).map(rec => 
              renderProfessionalCard(rec.professional, rec)
            )}
          </div>
          
          {aiRecommendations.length > 4 && (
            <div className="mt-4 text-center">
              <GlassButton variant="secondary" size="sm">
                View {aiRecommendations.length - 4} More AI Recommendations
              </GlassButton>
            </div>
          )}
        </div>
      )}
      
      {/* All Results */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-white/60" />
          All Professionals
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProfessionals.map(prof => {
          // Find if this professional has an AI recommendation
          const aiRec = aiRecommendations.find(r => r.professional.id === prof.id)
          return renderProfessionalCard(prof, aiRec)
        })}
      </div>
      
      {/* Empty State */}
      {filteredProfessionals.length === 0 && (
        <GlassPanel className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No professionals found matching your criteria</p>
          <p className="text-sm text-white/40 mt-2">Try adjusting your filters</p>
        </GlassPanel>
      )}
    </div>
  )
}