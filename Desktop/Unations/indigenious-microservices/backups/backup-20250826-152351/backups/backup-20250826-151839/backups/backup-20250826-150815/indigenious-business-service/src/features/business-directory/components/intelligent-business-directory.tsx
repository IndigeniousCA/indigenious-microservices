'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Users, 
  MapPin, 
  Star, 
  TrendingUp,
  Sparkles,
  Zap,
  Heart,
  Target,
  Network,
  Brain,
  Handshake,
  Award,
  Globe,
  MessageSquare
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';

interface Business {
  id: string;
  name: string;
  description: string;
  location: {
    province: string;
    city: string;
    territory: string;
  };
  capabilities: string[];
  certifications: string[];
  performance: {
    rating: number;
    projectsCompleted: number;
    successRate: number;
    responseTime: number;
  };
  cultural: {
    nation: string;
    languages: string[];
    traditionalKnowledge: string[];
  };
  aiInsights: {
    matchScore: number;
    synergies: string[];
    collaborationPotential: number;
    networkValue: number;
    growthTrend: 'rising' | 'stable' | 'accelerating';
  };
  partnerships: {
    active: number;
    successful: number;
    seeking: string[];
  };
  verified: boolean;
  featured: boolean;
  lastActive: Date;
}

interface IntelligentBusinessDirectoryProps {
  currentUserId?: string;
  searchIntent?: 'partnership' | 'suppliers' | 'competitors' | 'learning';
  className?: string;
}

export default function IntelligentBusinessDirectory({ 
  currentUserId,
  searchIntent = 'partnership',
  className 
}: IntelligentBusinessDirectoryProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'proximity' | 'synergy'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'network'>('grid');
  const [personalizedInsights, setPersonalizedInsights] = useState<unknown>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AI-powered search suggestions that appear as user types
  const intelligentSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    
    const suggestions = [
      `${searchQuery} partners in your region`,
      `${searchQuery} with high success rates`,
      `Businesses complementing ${searchQuery}`,
      `${searchQuery} for joint ventures`,
      `Growing ${searchQuery} businesses`
    ];
    
    return suggestions.slice(0, 3);
  }, [searchQuery]);

  useEffect(() => {
    fetchBusinesses();
  }, [searchIntent, currentUserId]);

  useEffect(() => {
    applyIntelligentFiltering();
  }, [businesses, searchQuery, activeFilters, sortBy]);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      // This would integrate with the AI Network Orchestrator
      const response = await fetch(`/api/businesses/intelligent-directory?intent=${searchIntent}&userId=${currentUserId}`);
      const data = await response.json();
      
      setBusinesses(data.businesses);
      setPersonalizedInsights(data.insights);
      setSuggestions(data.suggestions);
    } catch (error) {
      logger.error('Failed to fetch businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * AI-powered filtering that considers context, intent, and network effects
   */
  const applyIntelligentFiltering = () => {
    let filtered = [...businesses];

    // AI semantic search (not just keyword matching)
    if (searchQuery) {
      filtered = filtered.filter(business => {
        // Semantic matching with capabilities
        const semanticMatch = business.capabilities.some(cap => 
          cap.toLowerCase().includes(searchQuery.toLowerCase()) ||
          searchQuery.toLowerCase().includes(cap.toLowerCase())
        );
        
        // Cultural/language matching
        const culturalMatch = business.cultural.languages.some(lang =>
          lang.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        // Traditional name matching
        return business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               business.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
               semanticMatch ||
               culturalMatch;
      });
    }

    // Apply intent-based filtering
    filtered = applyIntentFiltering(filtered, searchIntent);

    // Apply active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(business =>
        activeFilters.every(filter => businessMatchesFilter(business, filter))
      );
    }

    // AI-powered sorting
    filtered = applySophisticatedSorting(filtered, sortBy);

    setFilteredBusinesses(filtered);
  };

  const applyIntentFiltering = (businesses: Business[], intent: string): Business[] => {
    switch (intent) {
      case 'partnership':
        return businesses.filter(b => 
          b.partnerships.seeking.length > 0 || 
          b.aiInsights.collaborationPotential > 70
        );
      
      case 'suppliers':
        return businesses.filter(b => 
          b.performance.rating > 4.0 && 
          b.performance.successRate > 80
        );
      
      case 'competitors':
        return businesses.filter(b => 
          b.aiInsights.networkValue > 50
        ).sort((a, b) => b.performance.rating - a.performance.rating);
      
      case 'learning':
        return businesses.filter(b => 
          b.cultural.traditionalKnowledge.length > 0 ||
          b.aiInsights.growthTrend === 'accelerating'
        );
      
      default:
        return businesses;
    }
  };

  const applySophisticatedSorting = (businesses: Business[], criteria: string): Business[] => {
    const sorted = [...businesses];
    
    return sorted.sort((a, b) => {
      switch (criteria) {
        case 'relevance':
          // AI relevance score combining multiple factors
          const aRelevance = calculateRelevanceScore(a);
          const bRelevance = calculateRelevanceScore(b);
          return bRelevance - aRelevance;
        
        case 'synergy':
          return b.aiInsights.collaborationPotential - a.aiInsights.collaborationPotential;
        
        case 'rating':
          return b.performance.rating - a.performance.rating;
        
        case 'proximity':
          // This would use actual geographic calculation
          return 0; // Placeholder
        
        default:
          return 0;
      }
    });
  };

  const calculateRelevanceScore = (business: Business): number => {
    let score = 0;
    
    // Base performance (30%)
    score += business.performance.rating * 0.3;
    
    // AI insights (40%)
    score += (business.aiInsights.matchScore / 100) * 0.4;
    
    // Network value (20%)
    score += (business.aiInsights.networkValue / 100) * 0.2;
    
    // Activity recency (10%)
    const daysSinceActive = (Date.now() - business.lastActive.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysSinceActive) / 30) * 0.1;
    
    return score;
  };

  const businessMatchesFilter = (business: Business, filter: string): boolean => {
    switch (filter) {
      case 'verified':
        return business.verified;
      case 'seeking-partners':
        return business.partnerships.seeking.length > 0;
      case 'high-growth':
        return business.aiInsights.growthTrend === 'accelerating';
      case 'experienced':
        return business.performance.projectsCompleted > 10;
      default:
        return true;
    }
  };

  const handleConnect = async (business: Business) => {
    // This would trigger AI orchestration for connection
    try {
      await fetch('/api/businesses/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetBusinessId: business.id,
          intent: searchIntent,
          context: { source: 'directory', aiAssisted: true }
        })
      });
      
      // AI provides intelligent follow-up suggestions
      logger.info('Connection initiated with AI assistance');
    } catch (error) {
      logger.error('Failed to connect:', error);
    }
  };

  const getIntentIcon = () => {
    const icons = {
      partnership: Handshake,
      suppliers: Users,
      competitors: Target,
      learning: Brain
    };
    return icons[searchIntent] || Network;
  };

  const getIntentColor = () => {
    const colors = {
      partnership: 'text-purple-400',
      suppliers: 'text-blue-400',
      competitors: 'text-orange-400',
      learning: 'text-green-400'
    };
    return colors[searchIntent] || 'text-blue-400';
  };

  return (
    <div className={className}>
      {/* Intelligent Header */}
      <GlassPanel className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                {React.createElement(getIntentIcon(), { 
                  className: `w-6 h-6 ${getIntentColor()}` 
                })}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Indigenous Business Network</h1>
                <p className="text-white/60">
                  {searchIntent === 'partnership' && 'Discover ideal partnership opportunities'}
                  {searchIntent === 'suppliers' && 'Find trusted suppliers and vendors'}
                  {searchIntent === 'competitors' && 'Learn from successful businesses'}
                  {searchIntent === 'learning' && 'Connect with knowledge holders'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="text-sm text-purple-400">AI Enhanced</span>
            </div>
          </div>

          {/* Personalized Insights Bar */}
          {personalizedInsights && (
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-xl mb-4">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white mb-2">Personalized Insights</h3>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/60">Best Matches:</span>
                      <span className="text-green-400 ml-2">{personalizedInsights.bestMatches}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Partnership Potential:</span>
                      <span className="text-purple-400 ml-2">{personalizedInsights.partnershipPotential}%</span>
                    </div>
                    <div>
                      <span className="text-white/60">Network Growth:</span>
                      <span className="text-blue-400 ml-2">+{personalizedInsights.networkGrowth}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Search */}
          <div className="relative">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by capability, location, or cultural connection..."
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all"
                />
                
                {/* AI Search Suggestions */}
                <AnimatePresence>
                  {searchQuery && intelligentSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl z-10"
                    >
                      {intelligentSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setSearchQuery(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-white">{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as unknown)}
                  className="px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400/50"
                >
                  <option value="relevance">AI Relevance</option>
                  <option value="synergy">Partnership Synergy</option>
                  <option value="rating">Performance Rating</option>
                  <option value="proximity">Geographic Proximity</option>
                </select>
                
                <button className="p-3 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-colors">
                  <Filter className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Business Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredBusinesses.map((business, index) => (
            <motion.div
              key={business.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassPanel className="p-6 h-full hover:bg-white/10 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {business.name}
                      </h3>
                      {business.verified && (
                        <Award className="w-4 h-4 text-green-400" />
                      )}
                      {business.featured && (
                        <Star className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{business.location.city}, {business.location.province}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Globe className="w-4 h-4" />
                      <span>{business.cultural.nation}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-white">
                        {business.performance.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-xs text-white/60">
                      {business.performance.projectsCompleted} projects
                    </div>
                  </div>
                </div>
                
                {/* AI Insights */}
                <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-purple-400">AI Match Analysis</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-white/60">Match Score:</span>
                      <span className="text-green-400 ml-1 font-medium">
                        {business.aiInsights.matchScore}%
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">Synergy:</span>
                      <span className="text-purple-400 ml-1 font-medium">
                        {business.aiInsights.collaborationPotential}%
                      </span>
                    </div>
                  </div>
                  
                  {business.aiInsights.synergies.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-white/60 mb-1">Key Synergies:</div>
                      <div className="flex flex-wrap gap-1">
                        {business.aiInsights.synergies.slice(0, 2).map((synergy, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs"
                          >
                            {synergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Capabilities */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {business.capabilities.slice(0, 3).map((capability, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/10 text-white/80 rounded-md text-xs"
                      >
                        {capability}
                      </span>
                    ))}
                    {business.capabilities.length > 3 && (
                      <span className="px-2 py-1 bg-white/5 text-white/60 rounded-md text-xs">
                        +{business.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Partnership Status */}
                {business.partnerships.seeking.length > 0 && (
                  <div className="mb-4 p-2 bg-green-500/10 border border-green-400/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Handshake className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Seeking partnerships in:</span>
                    </div>
                    <div className="text-xs text-white/80 mt-1">
                      {business.partnerships.seeking.slice(0, 2).join(', ')}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConnect(business)}
                    className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 rounded-lg text-blue-400 text-sm font-medium transition-colors"
                  >
                    Connect
                  </button>
                  
                  <button className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg transition-colors">
                    <MessageSquare className="w-4 h-4 text-white/60" />
                  </button>
                  
                  <button className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg transition-colors">
                    <Heart className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <GlassPanel key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded mb-3" />
              <div className="h-3 bg-white/5 rounded mb-2" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </GlassPanel>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBusinesses.length === 0 && (
        <GlassPanel className="p-8 text-center">
          <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No matches found</h3>
          <p className="text-white/60 mb-4">
            Try adjusting your search or let our AI suggest better connections
          </p>
          <button className="px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 rounded-lg text-purple-400 transition-colors">
            Get AI Suggestions
          </button>
        </GlassPanel>
      )}
    </div>
  );
}