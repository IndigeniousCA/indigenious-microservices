'use client';

import { useState } from 'react';
import { BrandCTA } from '@/lib/brand/brand-components';
import { Sparkles, FileText, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface BidOpportunity {
  id: string;
  title: string;
  department: string;
  value: string;
  deadline: string;
  matchScore: number;
  winProbability: number;
  suggestedPartners?: string[];
  keyRequirements: string[];
  missingQualifications?: string[];
}

const mockOpportunity: BidOpportunity = {
  id: '1',
  title: 'Cloud Infrastructure Modernization',
  department: 'Shared Services Canada',
  value: '$250,000 - $500,000',
  deadline: '2025-02-15',
  matchScore: 87,
  winProbability: 72,
  suggestedPartners: ['Northern Engineering Solutions'],
  keyRequirements: [
    'AWS Certification',
    'Security Clearance',
    '5 years experience',
    'Indigenous ownership 51%+',
  ],
  missingQualifications: ['AWS Advanced Certification'],
};

export default function BidAssistant() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  
  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowDraft(true);
    }, 2000);
  };
  
  return (
    <div className="space-y-4">
      {/* Current Opportunity */}
      <div className="bg-amber-50 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-gray-900">{mockOpportunity.title}</h4>
            <p className="text-sm text-gray-600">{mockOpportunity.department}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-amber-600">{mockOpportunity.matchScore}%</div>
            <div className="text-xs text-gray-500">match</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
          <div>
            <span className="text-gray-600">Value:</span>
            <p className="font-semibold">{mockOpportunity.value}</p>
          </div>
          <div>
            <span className="text-gray-600">Deadline:</span>
            <p className="font-semibold">{mockOpportunity.deadline}</p>
          </div>
        </div>
      </div>
      
      {/* AI Analysis */}
      {!showDraft ? (
        <div className="space-y-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg py-3 font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                Analyzing Requirements...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Winning Bid
              </>
            )}
          </button>
          
          <div className="space-y-2">
            <h5 className="font-semibold text-gray-900">Requirements Analysis</h5>
            <div className="space-y-1">
              {mockOpportunity.keyRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">{req}</span>
                </div>
              ))}
              {mockOpportunity.missingQualifications?.map((qual, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-gray-700">{qual} (missing)</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 AI Tip:</span> Partner with {mockOpportunity.suggestedPartners?.[0]} to 
              increase your win probability from <span className="font-semibold">72%</span> to <span className="font-semibold">94%</span>.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h5 className="font-semibold text-green-900">Bid Draft Ready!</h5>
            </div>
            <p className="text-sm text-green-800 mb-3">
              AI has generated a winning bid based on 1,247 successful similar proposals.
            </p>
            <div className="space-y-2">
              <div className="bg-white rounded p-2">
                <p className="text-xs font-semibold text-gray-600">Executive Summary</p>
                <p className="text-sm text-gray-800 mt-1">
                  Lightning Construction brings 15 years of cloud infrastructure expertise...
                </p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-xs font-semibold text-gray-600">Technical Approach</p>
                <p className="text-sm text-gray-800 mt-1">
                  Our phased migration strategy ensures zero downtime...
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <BrandCTA href="/business/bids/edit/1" variant="primary" size="sm" className="flex-1">
              Edit & Submit
            </BrandCTA>
            <BrandCTA variant="secondary" size="sm" onClick={() => setShowDraft(false)}>
              Regenerate
            </BrandCTA>
          </div>
        </div>
      )}
      
      {/* Success Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900">89%</div>
          <div className="text-xs text-gray-600">Win Rate</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900">3.2x</div>
          <div className="text-xs text-gray-600">More Wins</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900">8hr</div>
          <div className="text-xs text-gray-600">Time Saved</div>
        </div>
      </div>
    </div>
  );
}