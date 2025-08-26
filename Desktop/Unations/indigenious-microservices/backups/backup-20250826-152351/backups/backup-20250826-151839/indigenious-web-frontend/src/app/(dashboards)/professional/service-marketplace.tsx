'use client';

import { useState } from 'react';
import { BrandCTA } from '@/lib/brand/brand-components';
import { DollarSign, Clock, MapPin, Briefcase, Star, TrendingUp } from 'lucide-react';

interface ServiceRequest {
  id: string;
  businessName: string;
  serviceType: string;
  budget: string;
  timeline: string;
  location: string;
  description: string;
  matchScore: number;
  postedTime: string;
  tags: string[];
}

const mockRequests: ServiceRequest[] = [
  {
    id: '1',
    businessName: 'First Nation Manufacturing',
    serviceType: 'RFP Response Writing',
    budget: '$5,000 - $8,000',
    timeline: 'Next 2 weeks',
    location: 'Thunder Bay, ON',
    description: 'Need expert help responding to federal infrastructure RFP',
    matchScore: 95,
    postedTime: '2 hours ago',
    tags: ['Federal', 'Infrastructure', 'Urgent'],
  },
  {
    id: '2',
    businessName: 'Indigenous Tech Startup',
    serviceType: 'Compliance Consulting',
    budget: '$3,000 - $5,000',
    timeline: '1 month',
    location: 'Remote',
    description: 'Setting up procurement compliance processes',
    matchScore: 88,
    postedTime: '5 hours ago',
    tags: ['Startup', 'Tech', 'Compliance'],
  },
  {
    id: '3',
    businessName: 'Northern Services Co-op',
    serviceType: 'Bid Strategy Development',
    budget: '$10,000+',
    timeline: 'Ongoing',
    location: 'Winnipeg, MB',
    description: 'Long-term partnership for strategic bid planning',
    matchScore: 82,
    postedTime: '1 day ago',
    tags: ['Long-term', 'Strategic', 'High-value'],
  },
];

export default function ServiceMarketplace() {
  const [filter, setFilter] = useState<'all' | 'best-match' | 'urgent' | 'high-value'>('all');
  
  const filteredRequests = mockRequests.filter(request => {
    switch (filter) {
      case 'best-match':
        return request.matchScore >= 90;
      case 'urgent':
        return request.tags.includes('Urgent') || request.timeline.includes('week');
      case 'high-value':
        return request.budget.includes('10,000') || request.budget.includes('+');
      default:
        return true;
    }
  });
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 pb-3 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Requests
        </button>
        <button
          onClick={() => setFilter('best-match')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'best-match' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Best Match
        </button>
        <button
          onClick={() => setFilter('urgent')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'urgent' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Urgent
        </button>
        <button
          onClick={() => setFilter('high-value')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'high-value' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          High Value
        </button>
      </div>
      
      {/* Request List */}
      <div className="space-y-3">
        {filteredRequests.map((request) => (
          <div
            key={request.id}
            className="border border-gray-200 rounded-lg p-3 hover:border-green-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{request.serviceType}</h4>
                  {request.matchScore >= 90 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {request.matchScore}% match
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{request.businessName}</p>
              </div>
              <span className="text-xs text-gray-500">{request.postedTime}</span>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">{request.description}</p>
            
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{request.budget}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{request.timeline}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{request.location}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {request.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <BrandCTA href={`/professional/requests/${request.id}`} size="sm">
                Submit Proposal
              </BrandCTA>
            </div>
          </div>
        ))}
      </div>
      
      {/* Opportunity Alert */}
      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">
              Your expertise matches 12 new opportunities
            </p>
            <p className="text-xs text-green-700 mt-1">
              Set up alerts to never miss high-value requests in your specialty areas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}