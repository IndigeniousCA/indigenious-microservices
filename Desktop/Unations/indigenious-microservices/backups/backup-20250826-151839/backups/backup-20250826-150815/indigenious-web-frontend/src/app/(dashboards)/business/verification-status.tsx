'use client';

import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';
import { Shield, CheckCircle, FileText, Award, TrendingUp, Users } from 'lucide-react';

interface VerificationLevel {
  name: string;
  status: 'completed' | 'current' | 'locked';
  benefits: string[];
  requirements?: string[];
}

const verificationLevels: VerificationLevel[] = [
  {
    name: 'Indigenious Registered',
    status: 'completed',
    benefits: [
      'Listed in directory',
      'Can view opportunities',
      'Basic profile',
    ],
  },
  {
    name: 'Indigenious Verified',
    status: 'completed',
    benefits: [
      'Verified badge',
      'Bid on contracts',
      'Quick pay eligible',
      'Priority support',
    ],
  },
  {
    name: 'Indigenious Certified',
    status: 'current',
    benefits: [
      'Premium badge',
      'Featured placement',
      'Advanced analytics',
      'Partner matching',
    ],
    requirements: [
      '10+ completed contracts',
      '95%+ performance rating',
      '$1M+ in revenue',
    ],
  },
  {
    name: 'Indigenious Elite',
    status: 'locked',
    benefits: [
      'Elite status badge',
      'Direct government access',
      'Exclusive opportunities',
      'Mentorship program',
    ],
    requirements: [
      '50+ completed contracts',
      '98%+ performance rating',
      '$5M+ in revenue',
      'Community leadership',
    ],
  },
];

export default function VerificationStatus() {
  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Your Current Status</h3>
            <p className="text-gray-600 mt-1">Member since 2019 • 23 completed contracts</p>
          </div>
          <IndigiousVerifiedBadge status="verified" size="lg" />
        </div>
        
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">100%</div>
            <div className="text-xs text-gray-600">Indigenous Owned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">4.9/5</div>
            <div className="text-xs text-gray-600">Client Rating</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">$2.1M</div>
            <div className="text-xs text-gray-600">Total Revenue</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">98%</div>
            <div className="text-xs text-gray-600">On-Time Delivery</div>
          </div>
        </div>
      </div>
      
      {/* Verification Journey */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Your Verification Journey</h4>
        <div className="space-y-4">
          {verificationLevels.map((level, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                level.status === 'completed' ? 'border-green-200 bg-green-50' :
                level.status === 'current' ? 'border-amber-200 bg-amber-50' :
                'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {level.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : level.status === 'current' ? (
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  ) : (
                    <Shield className="w-6 h-6 text-gray-400" />
                  )}
                  <h5 className="font-semibold text-gray-900">{level.name}</h5>
                </div>
                {level.status === 'current' && (
                  <span className="text-sm font-semibold text-amber-600">In Progress</span>
                )}
              </div>
              
              <div className="ml-9">
                <p className="text-sm text-gray-600 mb-2">Benefits:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {level.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
                
                {level.requirements && level.status !== 'completed' && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-1">Requirements:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {level.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-gray-400">•</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {level.status === 'current' && (
                <div className="mt-3 ml-9">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Progress to next level</span>
                    <span className="text-sm font-semibold text-amber-600">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Network Value */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Network Benefits
        </h4>
        <p className="text-sm text-blue-800">
          Your verification is recognized by <span className="font-semibold">342 government departments</span> and 
          <span className="font-semibold"> 450+ corporations</span>. No need to re-verify for each client - 
          one verification works everywhere in the Indigenious network.
        </p>
      </div>
    </div>
  );
}