'use client';

import { useState } from 'react';
import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';
import { Users, Briefcase, MapPin, Star, Handshake, TrendingUp } from 'lucide-react';

interface PotentialPartner {
  id: string;
  businessName: string;
  specialty: string[];
  location: string;
  matchScore: number;
  sharedOpportunities: number;
  successRate: number;
  verified: boolean;
  complementarySkills: string[];
}

const mockPartners: PotentialPartner[] = [
  {
    id: '1',
    businessName: 'Northern Engineering Solutions',
    specialty: ['Civil Engineering', 'Project Management'],
    location: 'Thunder Bay, ON',
    matchScore: 95,
    sharedOpportunities: 8,
    successRate: 92,
    verified: true,
    complementarySkills: ['Technical specs', 'CAD drawings'],
  },
  {
    id: '2',
    businessName: 'Eagle Financial Consulting',
    specialty: ['Financial Analysis', 'Grant Writing'],
    location: 'Winnipeg, MB',
    matchScore: 88,
    sharedOpportunities: 5,
    successRate: 88,
    verified: true,
    complementarySkills: ['Budget planning', 'Compliance'],
  },
  {
    id: '3',
    businessName: 'Traditional Knowledge Keepers Inc',
    specialty: ['Environmental Assessment', 'Cultural Advisory'],
    location: 'Remote Services',
    matchScore: 82,
    sharedOpportunities: 3,
    successRate: 100,
    verified: true,
    complementarySkills: ['TEK integration', 'Community liaison'],
  },
];

export default function PartnerMatcher() {
  const [selectedPartner, setSelectedPartner] = useState<PotentialPartner | null>(null);
  
  return (
    <div className="space-y-4">
      {/* AI Recommendation */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
          <Star className="w-4 h-4" />
          AI Recommendation
        </h4>
        <p className="text-sm text-purple-800">
          Based on your past bids, partnering with an engineering firm could increase your win rate by 
          <span className="font-semibold"> 45%</span> on infrastructure projects.
        </p>
      </div>
      
      {/* Partner List */}
      <div className="space-y-3">
        {mockPartners.map((partner) => (
          <div
            key={partner.id}
            className="border border-gray-200 rounded-lg p-3 hover:border-purple-500 transition-colors cursor-pointer"
            onClick={() => setSelectedPartner(partner)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{partner.businessName}</h4>
                  {partner.verified && <IndigiousVerifiedBadge size="sm" />}
                </div>
                <p className="text-sm text-gray-600">{partner.specialty.join(' • ')}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">{partner.matchScore}%</div>
                <div className="text-xs text-gray-500">match</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{partner.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{partner.sharedOpportunities} opportunities</span>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-2">
                {partner.complementarySkills.slice(0, 2).map((skill) => (
                  <span key={skill} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {skill}
                  </span>
                ))}
              </div>
              <span className="text-xs text-green-600 font-semibold">
                {partner.successRate}% success rate
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Partnership Benefits */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Why Partner?</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <Handshake className="w-4 h-4 text-purple-600 mt-0.5" />
            <p>Win larger contracts you couldn't handle alone</p>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5" />
            <p>Increase win rate by combining complementary skills</p>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-purple-600 mt-0.5" />
            <p>Build long-term relationships for recurring revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}