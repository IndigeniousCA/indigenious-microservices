// Community Profile Component
// Detailed community information display

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Users, Briefcase, Globe, Wifi, Car,
  Building, Heart, BookOpen, Phone, Mail, Calendar,
  TrendingUp, AlertCircle, CheckCircle, Info,
  ChevronRight, ExternalLink, Download, Share2,
  Feather, DollarSign, Award, Shield, X, Target
} from 'lucide-react'
import { Community, ContactMethod } from '../types/geographic.types'

interface CommunityProfileProps {
  community: Community
  onContactClick?: (contact: Community['contacts'][0]) => void
  onViewOnMap?: () => void
}

export function CommunityProfile({
  community,
  onContactClick,
  onViewOnMap
}: CommunityProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'economic' | 'cultural' | 'opportunities'>('overview')
  const [showAllContacts, setShowAllContacts] = useState(false)

  // Format number
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-CA').format(value)
  }

  // Format percentage
  const formatPercentage = (value: number, decimals = 1): string => {
    return `${value.toFixed(decimals)}%`
  }

  // Get infrastructure status
  const getInfrastructureStatus = () => {
    const hasGoodInternet = ['fiber', 'broadband'].includes(community.infrastructure.internetSpeed || '')
    const hasYearRoundAccess = community.infrastructure.roadAccess === 'year-round'
    const reliableUtilities = community.infrastructure.utilities.every(u => 
      ['excellent', 'good'].includes(u.reliability)
    )

    if (hasGoodInternet && hasYearRoundAccess && reliableUtilities) {
      return { level: 'excellent', color: 'emerald', icon: CheckCircle }
    } else if (hasGoodInternet || hasYearRoundAccess) {
      return { level: 'good', color: 'blue', icon: Info }
    } else {
      return { level: 'challenging', color: 'amber', icon: AlertCircle }
    }
  }

  const infrastructure = getInfrastructureStatus()

  // Format contact method
  const formatContactMethod = (method: ContactMethod): string => {
    const methods: Record<ContactMethod, string> = {
      email: 'Email',
      phone: 'Phone',
      'in-person': 'In Person',
      video: 'Video Call',
      mail: 'Mail',
      'through-council': 'Through Council'
    }
    return methods[method] || method
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 
        rounded-t-xl overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{community.name}</h1>
              <div className="flex items-center space-x-4 text-white/80">
                <span className="flex items-center space-x-1">
                  <Feather className="w-4 h-4" />
                  <span>{community.nation}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{community.location.province}</span>
                </span>
                {community.bandNumber && (
                  <span className="flex items-center space-x-1">
                    <Shield className="w-4 h-4" />
                    <span>Band #{community.bandNumber}</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={onViewOnMap}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 
                  border border-white/30 rounded-lg text-white 
                  transition-colors flex items-center space-x-2"
              >
                <MapPin className="w-4 h-4" />
                <span>View on Map</span>
              </button>
              <button className="p-2 bg-white/20 hover:bg-white/30 
                border border-white/30 rounded-lg text-white transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-white/10">
        {(['overview', 'economic', 'cultural', 'opportunities'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-purple-300 border-b-2 border-purple-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span className="text-white/60 text-sm">Population</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(community.population.total)}
                  </p>
                  {community.population.onReserve && (
                    <p className="text-white/60 text-sm">
                      {formatNumber(community.population.onReserve)} on territory
                    </p>
                  )}
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Briefcase className="w-5 h-5 text-emerald-400" />
                    <span className="text-white/60 text-sm">Businesses</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {community.economic.businesses}
                  </p>
                  <p className="text-emerald-300 text-sm">
                    +{formatPercentage(community.economic.businessGrowth || 0, 1)}
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <span className="text-white/60 text-sm">Employment</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatPercentage(community.economic.employmentRate)}
                  </p>
                  <p className="text-white/60 text-sm">
                    {formatNumber(community.population.workforce || 0)} workforce
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <infrastructure.icon className={`w-5 h-5 text-${infrastructure.color}-400`} />
                    <span className="text-white/60 text-sm">Infrastructure</span>
                  </div>
                  <p className={`text-lg font-bold text-${infrastructure.color}-300 capitalize`}>
                    {infrastructure.level}
                  </p>
                  <p className="text-white/60 text-sm">
                    {community.infrastructure.roadAccess.replace(/-/g, ' ')}
                  </p>
                </div>
              </div>

              {/* Location & Access */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-purple-400" />
                  <span>Location & Access</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Address</p>
                    <p className="text-white">
                      {community.location.address}
                      {community.location.postalCode && `, ${community.location.postalCode}`}
                    </p>
                    <p className="text-white/80">
                      {community.location.region}, {community.location.province}
                    </p>
                  </div>

                  {community.infrastructure.nearestCity && (
                    <div>
                      <p className="text-white/60 text-sm mb-1">Nearest City</p>
                      <p className="text-white">
                        {community.infrastructure.nearestCity.name}
                      </p>
                      <p className="text-white/80 text-sm">
                        {community.infrastructure.nearestCity.distance} km 
                        ({community.infrastructure.nearestCity.driveTime} min drive)
                      </p>
                    </div>
                  )}
                </div>

                {community.location.accessNotes && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-400/30 rounded">
                    <p className="text-amber-200 text-sm flex items-start space-x-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{community.location.accessNotes}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Services */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Building className="w-5 h-5 text-purple-400" />
                  <span>Community Services</span>
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(community.services).map(([service, available]) => {
                    const serviceLabels = {
                      healthCenter: 'Health Center',
                      school: 'School',
                      communityCenter: 'Community Center',
                      eldersCare: 'Elders Care',
                      youthPrograms: 'Youth Programs',
                      culturalCenter: 'Cultural Center'
                    }
                    
                    return (
                      <div
                        key={service}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          available
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {available ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span className="text-sm">
                          {serviceLabels[service as keyof typeof serviceLabels]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Contacts */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Phone className="w-5 h-5 text-purple-400" />
                  <span>Key Contacts</span>
                </h3>
                
                <div className="space-y-3">
                  {community.contacts
                    .slice(0, showAllContacts ? undefined : 2)
                    .map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => onContactClick?.(contact)}
                        className="p-3 bg-white/5 rounded-lg hover:bg-white/10 
                          transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white font-medium">{contact.name}</p>
                            <p className="text-white/70 text-sm">{contact.role}</p>
                            {contact.department && (
                              <p className="text-white/60 text-sm">{contact.department}</p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/40" />
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-blue-300 hover:text-blue-200 
                                flex items-center space-x-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="w-4 h-4" />
                              <span>Email</span>
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-blue-300 hover:text-blue-200 
                                flex items-center space-x-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call</span>
                            </a>
                          )}
                          <span className="text-white/60">
                            Prefers: {formatContactMethod(contact.preferredContact)}
                          </span>
                        </div>
                      </div>
                    ))}
                  
                  {community.contacts.length > 2 && (
                    <button
                      onClick={() => setShowAllContacts(!showAllContacts)}
                      className="text-purple-300 hover:text-purple-200 text-sm"
                    >
                      {showAllContacts ? 'Show less' : `Show ${community.contacts.length - 2} more`}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Economic Tab */}
          {activeTab === 'economic' && (
            <motion.div
              key="economic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Economic Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 
                  backdrop-blur-md border border-emerald-400/30 rounded-xl p-6">
                  <DollarSign className="w-8 h-8 text-emerald-400 mb-3" />
                  <p className="text-white/70 text-sm">Median Income</p>
                  <p className="text-2xl font-bold text-white">
                    ${formatNumber(community.economic.medianIncome || 0)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 
                  backdrop-blur-md border border-blue-400/30 rounded-xl p-6">
                  <Briefcase className="w-8 h-8 text-blue-400 mb-3" />
                  <p className="text-white/70 text-sm">Business Growth</p>
                  <p className="text-2xl font-bold text-white">
                    +{formatPercentage(community.economic.businessGrowth || 0, 1)}
                  </p>
                  <p className="text-blue-300 text-sm">Year over year</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 
                  backdrop-blur-md border border-purple-400/30 rounded-xl p-6">
                  <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
                  <p className="text-white/70 text-sm">Economic Leakage</p>
                  <p className="text-2xl font-bold text-white">
                    {formatPercentage(community.economic.economicLeakage || 0)}
                  </p>
                  <p className="text-purple-300 text-sm">Spent outside</p>
                </div>
              </div>

              {/* Major Industries */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Major Industries</h3>
                <div className="flex flex-wrap gap-2">
                  {community.economic.majorIndustries.map(industry => (
                    <span
                      key={industry}
                      className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 
                        rounded-full text-blue-200 text-sm"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </div>

              {/* Infrastructure Details */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Infrastructure</h3>
                <div className="space-y-3">
                  {/* Internet */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                    <div className="flex items-center space-x-3">
                      <Wifi className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">Internet</p>
                        <p className="text-white/60 text-sm capitalize">
                          {community.infrastructure.internetSpeed} - {community.infrastructure.internetReliability}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${
                      ['fiber', 'broadband'].includes(community.infrastructure.internetSpeed || '')
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {community.infrastructure.internetSpeed}
                    </div>
                  </div>

                  {/* Road Access */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                    <div className="flex items-center space-x-3">
                      <Car className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">Road Access</p>
                        <p className="text-white/60 text-sm capitalize">
                          {community.infrastructure.roadAccess.replace(/-/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Utilities */}
                  {community.infrastructure.utilities.map(utility => (
                    <div key={utility.type} className="flex items-center justify-between p-3 bg-white/5 rounded">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-amber-400" />
                        <div>
                          <p className="text-white font-medium capitalize">{utility.type}</p>
                          {utility.provider && (
                            <p className="text-white/60 text-sm">{utility.provider}</p>
                          )}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        ['excellent', 'good'].includes(utility.reliability)
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {utility.reliability}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Cultural Tab */}
          {activeTab === 'cultural' && community.culturalInfo && (
            <motion.div
              key="cultural"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Languages */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <span>Languages</span>
                </h3>
                
                <div className="space-y-3">
                  {community.culturalInfo.languages.map(language => (
                    <div key={language.name} className="flex items-center justify-between 
                      p-3 bg-white/5 rounded">
                      <div>
                        <p className="text-white font-medium">{language.name}</p>
                        <p className="text-white/60 text-sm">
                          {formatNumber(language.speakers)} speakers - {language.status}
                        </p>
                      </div>
                      {language.revitalization && (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 
                          rounded-full text-sm">
                          Revitalization program
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Traditions & Ceremonies */}
              {community.culturalInfo.ceremonies && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span>Ceremonies & Traditions</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-white/60 text-sm mb-2">Ceremony Types</p>
                      <div className="flex flex-wrap gap-2">
                        {community.culturalInfo.ceremonies.types.map(ceremony => (
                          <span key={ceremony} className="px-3 py-1 bg-purple-500/20 
                            border border-purple-400/30 rounded-full text-purple-200 text-sm">
                            {ceremony}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Season</span>
                      <span className="text-white">{community.culturalInfo.ceremonies.season}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Participation</span>
                      <span className="text-white capitalize">
                        {community.culturalInfo.ceremonies.participation}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Arts & Crafts */}
              {community.culturalInfo.artsCrafts && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Traditional Arts & Crafts</h3>
                  <div className="flex flex-wrap gap-2">
                    {community.culturalInfo.artsCrafts.map(art => (
                      <span key={art} className="px-3 py-1 bg-amber-500/20 
                        border border-amber-400/30 rounded-full text-amber-200 text-sm">
                        {art}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Opportunities Tab */}
          {activeTab === 'opportunities' && community.opportunities && (
            <motion.div
              key="opportunities"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Strengths */}
              <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-emerald-200 mb-3 
                  flex items-center space-x-2">
                  <Award className="w-5 h-5" />
                  <span>Community Strengths</span>
                </h3>
                <ul className="space-y-2">
                  {community.opportunities.strengths.map((strength, index) => (
                    <li key={index} className="text-white/80 flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Challenges */}
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-amber-200 mb-3 
                  flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Current Challenges</span>
                </h3>
                <ul className="space-y-2">
                  {community.opportunities.challenges.map((challenge, index) => (
                    <li key={index} className="text-white/80 flex items-start space-x-2">
                      <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Priorities */}
              <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-200 mb-3 
                  flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Development Priorities</span>
                </h3>
                <div className="space-y-3">
                  {community.opportunities.priorities.map((priority, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full 
                        flex items-center justify-center">
                        <span className="text-blue-300 font-medium">{index + 1}</span>
                      </div>
                      <span className="text-white">{priority}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partnerships */}
              <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-200 mb-3 
                  flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Active Partnerships</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {community.opportunities.partnerships.map(partner => (
                    <span key={partner} className="px-3 py-1 bg-purple-500/20 
                      border border-purple-400/30 rounded-full text-purple-200 text-sm">
                      {partner}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-white/60 text-sm">
          <Info className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 
            border border-white/20 rounded-lg text-white/80 
            transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Download Profile</span>
          </button>
          <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
            border border-purple-400/50 rounded-lg text-purple-200 
            transition-colors flex items-center space-x-2">
            <ExternalLink className="w-4 h-4" />
            <span>View Opportunities</span>
          </button>
        </div>
      </div>
    </div>
  )
}