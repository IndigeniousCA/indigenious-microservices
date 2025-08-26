'use client';

import { Lock, TrendingUp, Users, DollarSign, Shield, Globe, Zap, Award } from 'lucide-react';

interface MonopolyMetric {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const monopolyMetrics: MonopolyMetric[] = [
  {
    label: 'Market Capture',
    value: '73%',
    subtext: 'of Indigenous procurement',
    icon: <Lock className="w-5 h-5" />,
    color: 'text-indigo-600 bg-indigo-50',
    trend: '+12% YoY',
  },
  {
    label: 'Switching Cost',
    value: '$125K',
    subtext: 'avg cost to leave platform',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'text-green-600 bg-green-50',
  },
  {
    label: 'Network Lock-in',
    value: '98%',
    subtext: 'retention rate',
    icon: <Users className="w-5 h-5" />,
    color: 'text-purple-600 bg-purple-50',
    trend: '+3% QoQ',
  },
  {
    label: 'Data Moat',
    value: '45M',
    subtext: 'proprietary data points',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    label: 'Geographic Control',
    value: '13/13',
    subtext: 'provinces/territories',
    icon: <Globe className="w-5 h-5" />,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    label: 'Transaction Velocity',
    value: '4.2K',
    subtext: 'daily transactions',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-orange-600 bg-orange-50',
    trend: '+67% MoM',
  },
];

interface CompetitiveMoat {
  barrier: string;
  strength: number; // 0-100
  description: string;
}

const competitiveMoats: CompetitiveMoat[] = [
  {
    barrier: 'Government Integration',
    strength: 95,
    description: '789 departments require our verification',
  },
  {
    barrier: 'Community Trust',
    strength: 92,
    description: 'Endorsed by 342 band councils',
  },
  {
    barrier: 'Technical Integration',
    strength: 88,
    description: 'Deep API integration with procurement systems',
  },
  {
    barrier: 'Brand Recognition',
    strength: 85,
    description: '"Indigenious Verified" is the standard',
  },
  {
    barrier: 'Data Advantage',
    strength: 90,
    description: '5 years of transaction history',
  },
];

export default function MonopolyMetrics() {
  return (
    <div className="space-y-6">
      {/* Monopoly Metrics Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monopoly Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {monopolyMetrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${metric.color.split(' ')[1]}`}>
                  <div className={metric.color.split(' ')[0]}>
                    {metric.icon}
                  </div>
                </div>
                {metric.trend && (
                  <span className="text-xs font-semibold text-green-600">
                    {metric.trend}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <p className="text-sm text-gray-600 mt-1">{metric.subtext}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Competitive Moats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitive Moats</h3>
        <div className="space-y-3">
          {competitiveMoats.map((moat, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{moat.barrier}</h4>
                <span className="text-sm font-bold text-indigo-600">{moat.strength}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${moat.strength}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{moat.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Monopoly Power Score */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Monopoly Power Score</h3>
            <p className="text-sm text-gray-600 mt-1">
              Composite measure of market dominance
            </p>
          </div>
          <Award className="w-10 h-10 text-indigo-600" />
        </div>
        
        <div className="relative">
          <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            91/100
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Market Control</span>
              <span className="font-semibold text-gray-900">Dominant</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Competitor Threat</span>
              <span className="font-semibold text-green-600">Very Low</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Regulatory Risk</span>
              <span className="font-semibold text-amber-600">Moderate</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Why We Win */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Competitors Can't Win</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5"></div>
            <div>
              <p className="font-medium text-gray-900">Trust Takes Years</p>
              <p className="text-sm text-gray-600">
                Indigenous communities won't trust a new platform overnight
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5"></div>
            <div>
              <p className="font-medium text-gray-900">Government Dependencies</p>
              <p className="text-sm text-gray-600">
                Procurement systems are integrated with our APIs
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5"></div>
            <div>
              <p className="font-medium text-gray-900">Network Effects</p>
              <p className="text-sm text-gray-600">
                Every user makes the platform more valuable for others
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5"></div>
            <div>
              <p className="font-medium text-gray-900">Data Advantage</p>
              <p className="text-sm text-gray-600">
                5 years of insights that can't be replicated
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}