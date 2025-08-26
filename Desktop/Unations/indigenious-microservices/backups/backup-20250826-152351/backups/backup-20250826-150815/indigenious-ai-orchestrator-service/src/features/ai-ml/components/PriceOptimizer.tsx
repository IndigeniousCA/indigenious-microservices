// Price Optimizer Component
// AI-powered competitive pricing analysis and optimization

import { useState, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DollarSign, TrendingUp, TrendingDown, BarChart3, Info,
  Calculator, Target, AlertTriangle, CheckCircle, ChevronRight,
  Clock, Users, MapPin, Shield, Activity, Settings, Download
} from 'lucide-react'
import { useAI } from '../hooks/useAI'
import type { PriceOptimization } from '../types/ai-ml.types'

interface PriceOptimizerProps {
  userId: string
  businessId?: string
}

interface PricingScenario {
  name: string
  price: number
  probability: number
  margin: number
  competitiveness: 'low' | 'medium' | 'high'
  risks: string[]
  benefits: string[]
}

export function PriceOptimizer({ userId, businessId }: PriceOptimizerProps) {
  const [selectedRFQ, setSelectedRFQ] = useState<string>('')
  const [basePrice, setBasePrice] = useState<string>('')
  const [includeIndigenousPreference, setIncludeIndigenousPreference] = useState(true)
  const [includeSustainability, setIncludeSustainability] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<PricingScenario | null>(null)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  const { 
    optimizePrice, 
    priceOptimizations,
    isLoading 
  } = useAI({ userId, businessId })

  // Handle price optimization
  const handleOptimizePrice = useCallback(async () => {
    if (!selectedRFQ || !basePrice) return

    try {
      await optimizePrice(selectedRFQ, {
        basePrice: Number(basePrice),
        includeIndigenousPreference,
        includeSustainability
      })
    } catch (error) {
      logger.error('Price optimization failed:', error)
    }
  }, [selectedRFQ, basePrice, includeIndigenousPreference, includeSustainability, optimizePrice])

  // Get current optimization
  const currentOptimization = selectedRFQ ? priceOptimizations.get(selectedRFQ) : null

  // Generate pricing scenarios
  const generateScenarios = (optimization: PriceOptimization): PricingScenario[] => {
    const baseScenarios: PricingScenario[] = [
      {
        name: 'Conservative',
        price: optimization.priceRange.max,
        probability: 65,
        margin: 25,
        competitiveness: 'low',
        risks: ['May lose to lower bids', 'Less competitive in tight market'],
        benefits: ['Higher profit margin', 'Room for negotiation', 'Quality positioning']
      },
      {
        name: 'Recommended',
        price: optimization.suggestedPrice,
        probability: 78,
        margin: 18,
        competitiveness: 'medium',
        risks: ['Moderate competition risk'],
        benefits: ['Balanced approach', 'Good win probability', 'Fair profit margin']
      },
      {
        name: 'Aggressive',
        price: optimization.priceRange.min,
        probability: 85,
        margin: 12,
        competitiveness: 'high',
        risks: ['Lower profit margin', 'Limited negotiation room'],
        benefits: ['High win probability', 'Market penetration', 'Volume opportunity']
      }
    ]

    return baseScenarios
  }

  // Calculate price impact
  const calculateImpact = (price: number, basePrice: number) => {
    const difference = price - basePrice
    const percentage = (difference / basePrice) * 100
    return { difference, percentage }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border 
        border-emerald-400/30 rounded-xl p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-emerald-500/20 rounded-lg">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Price Optimizer</h2>
            <p className="text-white/60">Competitive pricing analysis powered by machine learning</p>
          </div>
        </div>

        {currentOptimization && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">
                ${currentOptimization.suggestedPrice.toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Optimal Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {Math.round(currentOptimization.confidence * 100)}%
              </div>
              <div className="text-white/60 text-sm">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                ${currentOptimization.factors.marketRate.toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Market Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">
                ${currentOptimization.factors.historicalWins.toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Winning Average</div>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Pricing Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-white/80 text-sm mb-2">Select RFQ</label>
            <select
              value={selectedRFQ}
              onChange={(e) => setSelectedRFQ(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="" className="bg-gray-800">Choose an RFQ...</option>
              <option value="rfq-001" className="bg-gray-800">Highway Maintenance - $750K</option>
              <option value="rfq-002" className="bg-gray-800">IT Infrastructure - $250K</option>
              <option value="rfq-003" className="bg-gray-800">Community Center - $2M</option>
            </select>
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">Your Base Cost</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Enter your cost estimate"
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Pricing Factors */}
        <div className="mt-6 space-y-3">
          <h4 className="text-white/80 text-sm font-medium mb-3">Pricing Factors</h4>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeIndigenousPreference}
              onChange={(e) => setIncludeIndigenousPreference(e.target.checked)}
              className="rounded text-emerald-500"
            />
            <div className="flex-1">
              <span className="text-white text-sm">Indigenous Business Preference (5-10%)</span>
              <p className="text-white/60 text-xs">Government preference for Indigenous businesses</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSustainability}
              onChange={(e) => setIncludeSustainability(e.target.checked)}
              className="rounded text-emerald-500"
            />
            <div className="flex-1">
              <span className="text-white text-sm">Sustainability Premium (3-5%)</span>
              <p className="text-white/60 text-xs">Premium for eco-friendly practices</p>
            </div>
          </label>
        </div>

        {/* Advanced Settings */}
        <div className="mt-4">
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-white/60 hover:text-white text-sm flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Advanced Settings</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${
              showAdvancedSettings ? 'rotate-90' : ''
            }`} />
          </button>

          <AnimatePresence>
            {showAdvancedSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/60 text-xs mb-1">Risk Tolerance</label>
                    <select className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded 
                      text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option className="bg-gray-800">Conservative</option>
                      <option className="bg-gray-800">Moderate</option>
                      <option className="bg-gray-800">Aggressive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs mb-1">Market Conditions</label>
                    <select className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded 
                      text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option className="bg-gray-800">Buyer's Market</option>
                      <option className="bg-gray-800">Balanced</option>
                      <option className="bg-gray-800">Seller's Market</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs mb-1">Competition Level</label>
                    <select className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded 
                      text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option className="bg-gray-800">Low (1-3 bidders)</option>
                      <option className="bg-gray-800">Medium (4-7 bidders)</option>
                      <option className="bg-gray-800">High (8+ bidders)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleOptimizePrice}
          disabled={!selectedRFQ || !basePrice || isLoading}
          className="mt-6 w-full px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 
            border border-emerald-400/50 rounded-lg text-emerald-200 font-medium 
            flex items-center justify-center space-x-2 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calculator className="w-5 h-5" />
          <span>{isLoading ? 'Optimizing...' : 'Optimize Pricing'}</span>
        </button>
      </div>

      {/* Optimization Results */}
      {currentOptimization && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Price Range Visualization */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Price Range Analysis</h3>
            
            <div className="relative mb-6">
              <div className="h-2 bg-white/10 rounded-full">
                <div className="absolute inset-0 flex items-center">
                  <div 
                    className="absolute h-2 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full"
                    style={{ 
                      left: '0%',
                      right: '0%'
                    }}
                  />
                </div>
                
                {/* Min marker */}
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2"
                  style={{ left: '0%' }}
                >
                  <div className="relative">
                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-white/60 whitespace-nowrap">
                      Min: ${currentOptimization.priceRange.min.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Optimal marker */}
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2"
                  style={{ 
                    left: `${((currentOptimization.suggestedPrice - currentOptimization.priceRange.min) / 
                           (currentOptimization.priceRange.max - currentOptimization.priceRange.min)) * 100}%` 
                  }}
                >
                  <div className="relative">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-lg" />
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-emerald-400 font-medium whitespace-nowrap">
                      Optimal: ${currentOptimization.suggestedPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Max marker */}
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2"
                  style={{ left: '100%' }}
                >
                  <div className="relative">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                    <div className="absolute -top-8 right-0 transform translate-x-1/2 text-xs text-white/60 whitespace-nowrap">
                      Max: ${currentOptimization.priceRange.max.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Factor Analysis */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="text-center">
                <div className="text-white/60 text-sm mb-1">Market Rate</div>
                <div className="text-xl font-semibold text-white">
                  ${currentOptimization.factors.marketRate.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/60 text-sm mb-1">Historical Wins</div>
                <div className="text-xl font-semibold text-white">
                  ${currentOptimization.factors.historicalWins.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/60 text-sm mb-1">Competition</div>
                <div className="text-xl font-semibold text-white">
                  ${currentOptimization.factors.competitionAnalysis.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/60 text-sm mb-1">Value Prop</div>
                <div className="text-xl font-semibold text-white">
                  ${currentOptimization.factors.valueProposition.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Scenarios */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pricing Scenarios</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generateScenarios(currentOptimization).map((scenario) => (
                <motion.div
                  key={scenario.name}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedScenario(scenario)}
                  className={`bg-white/5 border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedScenario?.name === scenario.name
                      ? 'border-emerald-400/50 bg-emerald-500/10'
                      : 'border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">{scenario.name}</h4>
                    <div className={`px-2 py-1 rounded text-xs ${
                      scenario.competitiveness === 'high' 
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : scenario.competitiveness === 'medium'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {scenario.competitiveness} competition
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        ${scenario.price.toLocaleString()}
                      </div>
                      {basePrice && (
                        <div className="text-xs text-white/60">
                          {calculateImpact(scenario.price, Number(basePrice)).percentage > 0 ? '+' : ''}
                          {calculateImpact(scenario.price, Number(basePrice)).percentage.toFixed(1)}% from base
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-white/60 text-xs">Win Rate</div>
                        <div className="text-emerald-400 font-medium">{scenario.probability}%</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-xs">Margin</div>
                        <div className="text-blue-400 font-medium">{scenario.margin}%</div>
                      </div>
                    </div>

                    {selectedScenario?.name === scenario.name && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-3 border-t border-white/10"
                      >
                        <div className="space-y-2">
                          <div>
                            <p className="text-emerald-400 text-xs font-medium mb-1">Benefits:</p>
                            <ul className="space-y-1">
                              {scenario.benefits.map((benefit, i) => (
                                <li key={i} className="flex items-start space-x-1 text-xs text-white/70">
                                  <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-amber-400 text-xs font-medium mb-1">Risks:</p>
                            <ul className="space-y-1">
                              {scenario.risks.map((risk, i) => (
                                <li key={i} className="flex items-start space-x-1 text-xs text-white/70">
                                  <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Pricing Insights</h3>
            
            <div className="space-y-3">
              {currentOptimization.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-white/80 text-sm">{insight}</p>
                </div>
              ))}
              
              {currentOptimization.culturalConsiderations && (
                <>
                  <div className="pt-3 border-t border-white/10">
                    <h4 className="text-purple-300 font-medium mb-2">Cultural Considerations</h4>
                    {currentOptimization.culturalConsiderations.map((consideration, index) => (
                      <div key={index} className="flex items-start space-x-3 mt-2">
                        <Shield className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                        <p className="text-white/80 text-sm">{consideration}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center space-x-3">
              <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                border border-emerald-400/50 rounded-lg text-emerald-200 text-sm 
                flex items-center space-x-2 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export Analysis</span>
              </button>
              
              <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                border border-blue-400/50 rounded-lg text-blue-200 text-sm 
                flex items-center space-x-2 transition-colors">
                <Activity className="w-4 h-4" />
                <span>View Trends</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}