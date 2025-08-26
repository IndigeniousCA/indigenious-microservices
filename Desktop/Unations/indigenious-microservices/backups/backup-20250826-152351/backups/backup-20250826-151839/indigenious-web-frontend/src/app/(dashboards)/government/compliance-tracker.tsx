'use client';

import { TrendingUp, TrendingDown, Target, Calendar, DollarSign } from 'lucide-react';

interface ComplianceData {
  currentRate: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  remainingBudget: number;
  requiredSpend: number;
  daysRemaining: number;
  quarterlyProgress: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
}

const mockData: ComplianceData = {
  currentRate: 4.2,
  target: 5.0,
  trend: 'up',
  remainingBudget: 28500000,
  requiredSpend: 1200000,
  daysRemaining: 89,
  quarterlyProgress: {
    q1: 3.8,
    q2: 4.1,
    q3: 4.0,
    q4: 4.2,
  },
};

export default function ComplianceTracker() {
  const progressPercentage = (mockData.currentRate / mockData.target) * 100;
  const isOnTrack = mockData.currentRate >= mockData.target;
  
  return (
    <div className="space-y-4">
      {/* Main Progress */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-4xl font-bold text-gray-900">{mockData.currentRate}%</span>
          {mockData.trend === 'up' ? (
            <TrendingUp className="w-6 h-6 text-green-600" />
          ) : (
            <TrendingDown className="w-6 h-6 text-red-600" />
          )}
        </div>
        <p className="text-sm text-gray-600 mb-4">Current Indigenous Procurement Rate</p>
        
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-8">
            <div 
              className={`h-8 rounded-full transition-all ${
                isOnTrack ? 'bg-green-600' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <div className="absolute top-0 right-0 h-8 w-px bg-gray-800" style={{ right: '0%' }}>
            <span className="absolute -top-6 -right-4 text-xs font-semibold">5% Target</span>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-semibold">Required Spend</span>
          </div>
          <p className="text-lg font-bold text-red-900">
            ${(mockData.requiredSpend / 1000000).toFixed(1)}M
          </p>
          <p className="text-xs text-red-700">to reach 5% target</p>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-semibold">Time Remaining</span>
          </div>
          <p className="text-lg font-bold text-blue-900">{mockData.daysRemaining}</p>
          <p className="text-xs text-blue-700">days until year end</p>
        </div>
      </div>
      
      {/* Quarterly Trend */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Quarterly Progress</h4>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(mockData.quarterlyProgress).map(([quarter, value]) => (
            <div key={quarter} className="text-center">
              <div className="text-xs text-gray-600 uppercase mb-1">{quarter}</div>
              <div className={`text-sm font-bold ${
                value >= mockData.target ? 'text-green-600' : 'text-gray-900'
              }`}>
                {value}%
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">AI Recommendations</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Award IT services contract to verified supplier (+0.3%)</li>
          <li>• Convert maintenance contract to Indigenous supplier (+0.2%)</li>
          <li>• Use standing offer with Indigenous businesses (+0.4%)</li>
        </ul>
      </div>
      
      {/* Warning */}
      {!isOnTrack && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            <span className="font-semibold">⚠️ Below Target:</span> You need to increase Indigenous 
            procurement by <span className="font-semibold">{(mockData.target - mockData.currentRate).toFixed(1)}%</span> or 
            face potential audit findings.
          </p>
        </div>
      )}
    </div>
  );
}