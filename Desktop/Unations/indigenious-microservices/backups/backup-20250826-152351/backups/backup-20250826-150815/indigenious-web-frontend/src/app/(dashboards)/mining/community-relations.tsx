'use client';

import { useState } from 'react';
import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';
import { MapPin, Users, FileText, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  territory: string;
  population: number;
  chiefAndCouncil: string;
  relationshipStatus: 'strong' | 'developing' | 'strained' | 'new';
  lastEngagement: string;
  activeAgreements: number;
  upcomingMilestones: number;
  sentiment: number; // -100 to 100
  verified: boolean;
}

const mockCommunities: Community[] = [
  {
    id: '1',
    name: 'Matawa First Nations',
    territory: 'Ring of Fire Region',
    population: 2500,
    chiefAndCouncil: 'Chief Sarah Moonias',
    relationshipStatus: 'strong',
    lastEngagement: '2 days ago',
    activeAgreements: 3,
    upcomingMilestones: 2,
    sentiment: 85,
    verified: true,
  },
  {
    id: '2',
    name: 'Webequie First Nation',
    territory: 'Northwestern Ontario',
    population: 800,
    chiefAndCouncil: 'Chief Cornelius Wabasse',
    relationshipStatus: 'developing',
    lastEngagement: '1 week ago',
    activeAgreements: 1,
    upcomingMilestones: 4,
    sentiment: 60,
    verified: true,
  },
  {
    id: '3',
    name: 'Neskantaga First Nation',
    territory: 'Treaty 9',
    population: 450,
    chiefAndCouncil: 'Chief Chris Moonias',
    relationshipStatus: 'strained',
    lastEngagement: '3 weeks ago',
    activeAgreements: 0,
    upcomingMilestones: 1,
    sentiment: 25,
    verified: true,
  },
];

export default function CommunityRelationsTracker() {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  
  const getStatusColor = (status: Community['relationshipStatus']) => {
    switch (status) {
      case 'strong': return 'text-green-600 bg-green-100';
      case 'developing': return 'text-blue-600 bg-blue-100';
      case 'strained': return 'text-red-600 bg-red-100';
      case 'new': return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 70) return 'text-green-600';
    if (sentiment >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <div className="space-y-4">
      {/* Community List */}
      <div className="space-y-3">
        {mockCommunities.map((community) => (
          <div
            key={community.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-amber-500 cursor-pointer transition-colors"
            onClick={() => setSelectedCommunity(community)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{community.name}</h3>
                  {community.verified && <IndigiousVerifiedBadge size="sm" />}
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {community.territory}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(community.relationshipStatus)}`}>
                {community.relationshipStatus}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Pop: {community.population.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{community.activeAgreements} agreements</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{community.lastEngagement}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${getSentimentColor(community.sentiment)}`} />
                <span className={`font-semibold ${getSentimentColor(community.sentiment)}`}>
                  {community.sentiment}% positive
                </span>
              </div>
            </div>
            
            {community.upcomingMilestones > 0 && (
              <div className="mt-2 flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {community.upcomingMilestones} upcoming milestone{community.upcomingMilestones > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Quick Stats */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Network Intelligence</h4>
        <p className="text-sm text-gray-700">
          Your communities are connected to <span className="font-semibold">47 other mining projects</span> in 
          the network. <span className="font-semibold">3 communities</span> are considering similar agreements 
          with competitors. Strengthen relationships now to maintain advantage.
        </p>
      </div>
    </div>
  );
}