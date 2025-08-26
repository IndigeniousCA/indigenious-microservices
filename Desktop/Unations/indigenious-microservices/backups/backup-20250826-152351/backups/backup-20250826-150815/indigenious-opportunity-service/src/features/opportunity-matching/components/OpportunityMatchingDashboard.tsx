'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Target, Users, TrendingUp, Bell, Filter,
  ChevronRight, Award, Clock, DollarSign, MapPin,
  BarChart3, Shield, Sparkles, AlertCircle, CheckCircle,
  Building2, Briefcase, Star, ArrowUp, ArrowDown,
  Eye, Heart, Share2, Calendar, Rocket, Brain
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { OpportunityMatchingService } from '../services/OpportunityMatchingService'
import { OpportunityMatch, RFQ, Business } from '../types'

interface OpportunityMatchingDashboardProps {
  businessId: string
}

export function OpportunityMatchingDashboard({ businessId }: OpportunityMatchingDashboardProps) {
  const [matchingService] = useState(() => new OpportunityMatchingService())
  const [activeView, setActiveView] = useState<'matches' | 'team' | 'insights' | 'live'>('matches')
  const [matches, setMatches] = useState<OpportunityMatch[]>([])
  const [selectedMatch, setSelectedMatch] = useState<OpportunityMatch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [liveOpportunities, setLiveOpportunities] = useState<RFQ[]>([])
  const [insights, setInsights] = useState<unknown>(null)

  useEffect(() => {
    loadMatches()
    startLiveMonitoring()
  }, [])

  const loadMatches = async () => {
    setIsLoading(true)
    try {
      // Mock data - in production, fetch from API
      const mockRFQs: RFQ[] = [
        {
          id: 'rfq-001',
          title: 'Northern Ontario Mining Infrastructure Development',
          description: 'Development of critical infrastructure for mining operations',
          client: {
            name: 'Ontario Ministry of Northern Development',
            type: 'Government',
            department: 'Mining Division'
          },
          project: {
            type: 'Infrastructure',
            industry: ['Mining', 'Construction'],
            location: {
              city: 'Thunder Bay',
              province: 'ON',
              region: 'Northern Ontario',
              remote: true,
              accessibleBy: ['road', 'air', 'winter road']
            },
            startDate: new Date('2024-06-01'),
            duration: 24,
            remote: true
          },
          value: {
            min: 50000000,
            max: 75000000,
            currency: 'CAD',
            budgetConfirmed: true
          },
          requirements: {
            mandatory: [],
            desirable: [],
            technical: [],
            certifications: ['ISO 9001', 'ISO 14001', 'COR Safety'],
            experience: []
          },
          indigenousRequirements: {
            minimumPercentage: 33,
            specificNations: ['Ojibway', 'Cree'],
            employmentTargets: [
              { category: 'Management', percentage: 20 },
              { category: 'Skilled Trades', percentage: 40 }
            ]
          },
          deadlines: {
            questions: new Date('2024-02-15'),
            submission: new Date('2024-03-01'),
            award: new Date('2024-04-01')
          },
          evaluation: {
            technical: 35,
            price: 25,
            indigenous: 25,
            experience: 15
          }
        },
        {
          id: 'rfq-002',
          title: 'First Nations Water Treatment Facility',
          description: 'Design and construction of modern water treatment facility',
          client: {
            name: 'Indigenous Services Canada',
            type: 'Government'
          },
          project: {
            type: 'Water Infrastructure',
            industry: ['Engineering', 'Construction'],
            location: {
              city: 'Sioux Lookout',
              province: 'ON',
              region: 'Northwestern Ontario',
              remote: true,
              accessibleBy: ['air', 'winter road']
            },
            startDate: new Date('2024-05-01'),
            duration: 18,
            remote: true
          },
          value: {
            min: 15000000,
            max: 25000000,
            currency: 'CAD',
            budgetConfirmed: true
          },
          requirements: {
            mandatory: [],
            desirable: [],
            technical: [],
            certifications: ['Professional Engineers', 'Water Treatment Certified'],
            experience: []
          },
          indigenousRequirements: {
            minimumPercentage: 51,
            specificNations: ['Lac Seul First Nation'],
            benefitSharing: true
          },
          deadlines: {
            questions: new Date('2024-02-20'),
            submission: new Date('2024-03-10'),
            award: new Date('2024-04-15')
          },
          evaluation: {
            technical: 40,
            price: 20,
            indigenous: 30,
            experience: 10
          }
        }
      ]

      const mockBusiness: Business = {
        id: businessId,
        name: 'Northern Construction Group',
        type: 'Indigenous',
        profile: {
          established: new Date('2010-01-01'),
          employees: 125,
          revenue: 35000000,
          locations: [{
            city: 'Thunder Bay',
            province: 'ON',
            region: 'Northern Ontario',
            remote: true,
            accessibleBy: ['road', 'air']
          }]
        },
        capabilities: {
          primary: ['Construction', 'Project Management'],
          secondary: ['Equipment Operation', 'Site Services'],
          certifications: [
            { type: 'ISO 9001', issuer: 'BSI', expiry: new Date('2025-01-01'), status: 'active' },
            { type: 'COR Safety', issuer: 'IHSA', expiry: new Date('2024-12-01'), status: 'active' }
          ],
          equipment: ['Excavators', 'Bulldozers', 'Cranes']
        },
        indigenous: {
          nation: 'Ojibway',
          ownershipPercentage: 100,
          communityConnections: ['Fort William First Nation', 'Red Rock Indian Band'],
          agreements: ['Impact Benefit Agreement', 'Revenue Sharing']
        },
        performance: {
          completedProjects: 67,
          winRate: 0.35,
          clientSatisfaction: 4.6,
          onTimeDelivery: 92
        }
      }

      const matchResults = await matchingService.matchOpportunities(mockRFQs, [mockBusiness])
      setMatches(matchResults)
      
      if (matchResults.length > 0) {
        setSelectedMatch(matchResults[0])
      }
    } catch (error) {
      logger.error('Error loading matches:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startLiveMonitoring = () => {
    // Subscribe to live opportunities
    const subscription = matchingService.subscribeToOpportunities({
      industries: ['Construction', 'Mining', 'Engineering'],
      indigenousContent: 25
    })

    subscription.onOpportunity = (rfq: RFQ) => {
      setLiveOpportunities(prev => [rfq, ...prev].slice(0, 5))
    }

    subscription.onMatch = (match: OpportunityMatch) => {
      setMatches(prev => [match, ...prev])
    }
  }

  const renderMatchCard = (match: OpportunityMatch) => {
    const urgencyColors = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green'
    }

    const urgencyColor = urgencyColors[match.urgency]

    return (
      <GlassPanel
        key={match.id}
        className={`p-6 cursor-pointer transition-all ${
          selectedMatch?.id === match.id ? 'border-blue-400/50' : ''
        }`}
        onClick={() => setSelectedMatch(match)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              {match.rfq.title}
            </h3>
            <p className="text-white/60 text-sm">
              {match.rfq.client.name}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {match.score.overall.toFixed(0)}%
            </div>
            <p className="text-xs text-white/60">Match Score</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <p className="text-white/60 text-xs">Value</p>
            <p className="text-white font-medium">
              ${(match.rfq.value.min / 1000000).toFixed(1)}M - ${(match.rfq.value.max / 1000000).toFixed(1)}M
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Indigenous</p>
            <p className="text-white font-medium">
              {match.rfq.indigenousRequirements.minimumPercentage}% required
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Deadline</p>
            <p className="text-white font-medium">
              {match.deadlineIn} days
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Urgency</p>
            <p className={`font-medium text-${urgencyColor}-400 capitalize`}>
              {match.urgency}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {match.analysis.strengths.slice(0, 2).map((strength, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
              <CheckCircle className="w-3 h-3" />
              {strength.factor}
            </span>
          ))}
          {match.analysis.gaps.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
              <AlertCircle className="w-3 h-3" />
              {match.analysis.gaps.length} gaps
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="text-white/60 hover:text-white transition-colors">
              <Eye className="w-5 h-5" />
            </button>
            <button className="text-white/60 hover:text-red-400 transition-colors">
              <Heart className="w-5 h-5" />
            </button>
            <button className="text-white/60 hover:text-blue-400 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
          <GlassButton size="sm">
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </GlassButton>
        </div>
      </GlassPanel>
    )
  }

  const renderMatchDetails = () => {
    if (!selectedMatch) return null

    return (
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Match Analysis</h3>

        {/* Score Breakdown */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Score Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(selectedMatch.score.breakdown).map(([category, score]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-white/60 capitalize">{category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-white text-sm w-10 text-right">{score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Strengths</h4>
          <div className="space-y-2">
            {selectedMatch.analysis.strengths.map((strength, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-white">{strength.factor}</p>
                  <p className="text-white/60 text-sm">{strength.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps & Solutions */}
        {selectedMatch.analysis.gaps.length > 0 && (
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Gaps & Solutions</h4>
            <div className="space-y-3">
              {selectedMatch.analysis.gaps.map((gap, i) => (
                <div key={i} className="p-4 bg-yellow-500/10 border border-yellow-400/50 rounded-lg">
                  <p className="text-white font-medium mb-2">{gap.requirement}</p>
                  <p className="text-white/60 text-sm mb-2">
                    Need: {gap.needed}
                  </p>
                  <div className="space-y-1">
                    {gap.solution.map((sol, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <span className="text-yellow-400">→</span>
                        <span className="text-white/80">{sol.description}</span>
                        <span className="text-white/60">({sol.timeRequired} days)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Recommended Actions</h4>
          <div className="space-y-2">
            {selectedMatch.recommendations.immediateActions.map((action, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  action.status === 'completed' ? 'bg-green-400' :
                  action.status === 'in-progress' ? 'bg-yellow-400' : 'bg-white/40'
                }`} />
                <p className="text-white flex-1">{action.task}</p>
                <p className="text-white/60 text-sm">
                  Due: {new Date(action.deadline).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Suggestion */}
        {selectedMatch.suggestedTeam && (
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Suggested Team</h4>
            <div className="p-4 bg-blue-500/10 border border-blue-400/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white">
                  Team Win Probability: <span className="font-bold text-blue-400">
                    {selectedMatch.suggestedTeam.winProbability}%
                  </span>
                </p>
                <GlassButton size="sm">
                  Build Team
                  <Users className="w-4 h-4 ml-2" />
                </GlassButton>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/60">Indigenous Content</p>
                  <p className="text-white font-medium">
                    {selectedMatch.suggestedTeam.composition.indigenousPercentage.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Capability Coverage</p>
                  <p className="text-white font-medium">
                    {selectedMatch.suggestedTeam.capabilities.coverage.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <GlassButton className="flex-1">
            <Rocket className="w-4 h-4 mr-2" />
            Start Proposal
          </GlassButton>
          <GlassButton variant="secondary">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Review
          </GlassButton>
        </div>
      </GlassPanel>
    )
  }

  const renderLiveOpportunities = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <div className="relative">
            <Bell className="w-6 h-6 text-yellow-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          Live Opportunities
        </h3>
        <p className="text-white/60 text-sm">Real-time from all sources</p>
      </div>

      {liveOpportunities.length === 0 ? (
        <GlassPanel className="p-8 text-center">
          <Zap className="w-12 h-12 text-white/40 mx-auto mb-3" />
          <p className="text-white/60">Monitoring for new opportunities...</p>
          <p className="text-white/40 text-sm mt-1">You'll be notified instantly when matches are found</p>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {liveOpportunities.map((rfq, i) => (
            <motion.div
              key={rfq.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassPanel className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{rfq.title}</p>
                    <p className="text-white/60 text-sm">
                      {rfq.client.name} • ${(rfq.value.min / 1000000).toFixed(1)}M-${(rfq.value.max / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    New
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-sm">{rfq.project.location.city}, {rfq.project.location.province}</span>
                  {rfq.indigenousRequirements.minimumPercentage > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-white/60 text-sm">
                        {rfq.indigenousRequirements.minimumPercentage}% Indigenous
                      </span>
                    </>
                  )}
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )

  const renderInsights = () => (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-400" />
          AI-Generated Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">87%</p>
            <p className="text-white/60 text-sm">Avg Match Score</p>
            <p className="text-green-400 text-xs mt-1">↑ 5% from last month</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">42%</p>
            <p className="text-white/60 text-sm">Win Rate</p>
            <p className="text-green-400 text-xs mt-1">↑ 8% from last quarter</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">3.2</p>
            <p className="text-white/60 text-sm">Days to Submit</p>
            <p className="text-yellow-400 text-xs mt-1">→ Industry avg: 5.1</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-400/50 rounded-lg">
            <h4 className="text-green-400 font-medium mb-2">Your Competitive Advantages</h4>
            <ul className="space-y-1 text-white/80 text-sm">
              <li>• 100% Indigenous ownership gives you priority in 73% of RFQs</li>
              <li>• Local presence in Northern Ontario matches 45% of opportunities</li>
              <li>• Strong safety record (0.8 TRIR) beats industry average by 60%</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-400/50 rounded-lg">
            <h4 className="text-blue-400 font-medium mb-2">Partnership Opportunities</h4>
            <ul className="space-y-1 text-white/80 text-sm">
              <li>• Engineering firms seeking Indigenous partners: 12 active</li>
              <li>• Complementary businesses in your region: 8 verified</li>
              <li>• Average partnership increases win rate by 35%</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-500/10 border border-purple-400/50 rounded-lg">
            <h4 className="text-purple-400 font-medium mb-2">Market Trends</h4>
            <ul className="space-y-1 text-white/80 text-sm">
              <li>• Infrastructure spending up 40% in Northern Ontario</li>
              <li>• 65% of new RFQs require 25%+ Indigenous content</li>
              <li>• Green energy projects increasing 3x year-over-year</li>
            </ul>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h4 className="text-white font-medium mb-4">Recommended Actions</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <Award className="w-5 h-5 text-yellow-400" />
            <div className="flex-1">
              <p className="text-white">Get ISO 14001 Environmental Certification</p>
              <p className="text-white/60 text-sm">Opens 23 additional opportunities worth $125M</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <Users className="w-5 h-5 text-blue-400" />
            <div className="flex-1">
              <p className="text-white">Partner with Certified Engineering Firm</p>
              <p className="text-white/60 text-sm">Required for 18 current opportunities</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <Target className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <p className="text-white">Expand into Renewable Energy</p>
              <p className="text-white/60 text-sm">$2.3B in projects over next 3 years</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </div>
        </div>
      </GlassPanel>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                Opportunity Matching
              </h2>
              <p className="text-sm text-white/60">
                AI-powered RFQ matching and team building
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{matches.length}</p>
              <p className="text-xs text-white/60">Active Matches</p>
            </div>
            <GlassButton>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </GlassButton>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
          {[
            { id: 'matches', name: 'Opportunities', icon: Briefcase, count: matches.length },
            { id: 'team', name: 'Team Builder', icon: Users },
            { id: 'insights', name: 'Insights', icon: BarChart3 },
            { id: 'live', name: 'Live Feed', icon: Zap, badge: true }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as unknown)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap relative ${
                  activeView === tab.id
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
                {tab.count !== undefined && (
                  <span className="ml-1 text-xs opacity-60">({tab.count})</span>
                )}
                {tab.badge && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </GlassPanel>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeView === 'matches' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {isLoading ? (
                  <GlassPanel className="p-8 text-center">
                    <Sparkles className="w-12 h-12 text-white/40 mx-auto mb-3 animate-pulse" />
                    <p className="text-white/60">Finding perfect matches...</p>
                  </GlassPanel>
                ) : (
                  matches.map(match => renderMatchCard(match))
                )}
              </div>
              <div>
                {renderMatchDetails()}
              </div>
            </div>
          )}

          {activeView === 'live' && renderLiveOpportunities()}
          {activeView === 'insights' && renderInsights()}

          {activeView === 'team' && (
            <GlassPanel className="p-8 text-center">
              <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Team Builder</h3>
              <p className="text-white/60 mb-6">
                Select an opportunity to build the perfect team
              </p>
              <GlassButton>
                Browse Opportunities
              </GlassButton>
            </GlassPanel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}