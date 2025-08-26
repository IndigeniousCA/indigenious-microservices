'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, Users, DollarSign, BarChart3, Brain, Activity } from 'lucide-react';
import { MarketTrend, OpportunityPrediction, CompetitorAnalysis } from './market-intelligence-engine';

interface IntelligenceData {
  trends: MarketTrend[];
  predictions: OpportunityPrediction[];
  competitors: CompetitorAnalysis[];
  alerts: Alert[];
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
}

const mockData: IntelligenceData = {
  trends: [
    {
      category: 'IT Services',
      trend: 'growing',
      growth: 67,
      volume: 234,
      averageValue: 125000,
      forecast: {
        next30Days: 15,
        next90Days: 45,
        nextYear: 180,
      },
      topPlayers: [
        { id: '1', name: 'Northern Tech', marketShare: 23 },
        { id: '2', name: 'Eagle Solutions', marketShare: 18 },
      ],
    },
    {
      category: 'Construction',
      trend: 'stable',
      growth: 5,
      volume: 156,
      averageValue: 450000,
      forecast: {
        next30Days: 2,
        next90Days: 6,
        nextYear: 24,
      },
      topPlayers: [
        { id: '3', name: 'Lightning Construction', marketShare: 31 },
        { id: '4', name: 'Bear Builders', marketShare: 22 },
      ],
    },
  ],
  predictions: [
    {
      sector: 'Cybersecurity',
      probability: 92,
      estimatedValue: 350000,
      timeline: 'Within a week',
      requiredCapabilities: ['Security clearance', 'ISO 27001', 'SOC 2'],
      suggestedPartners: ['SecureNet Indigenous', 'Northern Cyber'],
      reasoning: 'Based on 12 historical RFQs with average 28 day cycle',
    },
    {
      sector: 'Environmental Assessment',
      probability: 78,
      estimatedValue: 175000,
      timeline: '14 days',
      requiredCapabilities: ['Environmental certification', 'Traditional knowledge'],
      suggestedPartners: ['Eagle Environmental', 'Green Nations'],
      reasoning: 'Seasonal pattern detected, Q4 procurement cycle',
    },
  ],
  competitors: [
    {
      businessId: '1',
      businessName: 'Lightning Construction',
      strengths: ['Strong certifications', 'Proven track record', 'High Indigenous employment'],
      weaknesses: ['Limited capacity', 'No security clearance'],
      winRate: 87,
      averageBidAmount: 425000,
      bidStrategy: 'aggressive',
      preferredSectors: ['Construction', 'Infrastructure', 'Facilities'],
      partnerships: ['Northern Engineering', 'Bear Architects'],
      threatLevel: 'high',
    },
  ],
  alerts: [
    {
      type: 'opportunity',
      severity: 'info',
      message: '3 high-probability opportunities detected',
      action: 'Review and prepare bids',
    },
    {
      type: 'competition',
      severity: 'warning',
      message: 'New competitor entering your primary sector',
      action: 'Strengthen partnerships and certifications',
    },
  ],
};

export default function IntelligenceDashboard() {
  const [data] = useState<IntelligenceData>(mockData);
  const [selectedView, setSelectedView] = useState<'trends' | 'predictions' | 'competitors'>('trends');
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'declining': return <TrendingDown className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-8 h-8 text-indigo-600" />
              Market Intelligence Command Center
            </h2>
            <p className="text-gray-600 mt-1">
              Real-time insights powered by aggregated platform data
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">$2.34B</div>
            <div className="text-sm text-gray-600">Total market value tracked</div>
          </div>
        </div>
        
        {/* Intelligence Alerts */}
        <div className="space-y-2">
          {data.alerts.map((alert, index) => (
            <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{alert.message}</p>
                <p className="text-sm mt-0.5">{alert.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* View Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedView('trends')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedView === 'trends'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Market Trends
        </button>
        <button
          onClick={() => setSelectedView('predictions')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedView === 'predictions'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Opportunity Predictions
        </button>
        <button
          onClick={() => setSelectedView('competitors')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedView === 'competitors'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Competitor Analysis
        </button>
      </div>
      
      {/* Content Views */}
      {selectedView === 'trends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.trends.map((trend, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{trend.category}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrendIcon(trend.trend)}
                    <span className={`font-semibold ${
                      trend.trend === 'growing' ? 'text-green-600' :
                      trend.trend === 'declining' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {trend.growth > 0 ? '+' : ''}{trend.growth}% growth
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{trend.volume}</div>
                  <div className="text-xs text-gray-600">RFQs</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Average Value</p>
                  <p className="font-semibold text-gray-900">
                    ${(trend.averageValue / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">1-Year Forecast</p>
                  <p className="font-semibold text-green-600">
                    +{trend.forecast.nextYear.toFixed(0)}%
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Top Players</p>
                <div className="space-y-1">
                  {trend.topPlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{player.name}</span>
                      <span className="font-semibold text-gray-900">{player.marketShare}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedView === 'predictions' && (
        <div className="space-y-4">
          {data.predictions.map((prediction, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{prediction.sector} Opportunity</h3>
                  <p className="text-sm text-gray-600 mt-1">{prediction.reasoning}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">{prediction.probability}%</div>
                  <div className="text-sm text-gray-600">probability</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Estimated Value
                  </p>
                  <p className="font-semibold text-gray-900">
                    ${(prediction.estimatedValue / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Timeline
                  </p>
                  <p className="font-semibold text-gray-900">{prediction.timeline}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Required Capabilities</p>
                  <p className="text-sm font-medium text-gray-900">
                    {prediction.requiredCapabilities.join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-indigo-900 mb-1">
                  Suggested Partners
                </p>
                <p className="text-sm text-indigo-800">
                  {prediction.suggestedPartners.join(' • ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedView === 'competitors' && (
        <div className="space-y-4">
          {data.competitors.map((competitor, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{competitor.businessName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      competitor.threatLevel === 'high' ? 'bg-red-100 text-red-800' :
                      competitor.threatLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {competitor.threatLevel} threat
                    </span>
                    <span className="text-sm text-gray-600">
                      {competitor.bidStrategy} strategy
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{competitor.winRate}%</div>
                  <div className="text-xs text-gray-600">win rate</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {competitor.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Weaknesses</p>
                  <ul className="space-y-1">
                    {competitor.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Average Bid</p>
                  <p className="font-semibold text-gray-900">
                    ${(competitor.averageBidAmount / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Preferred Sectors</p>
                  <p className="text-sm font-medium text-gray-900">
                    {competitor.preferredSectors.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}