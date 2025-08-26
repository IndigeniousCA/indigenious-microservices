'use client';

import { useState } from 'react';
import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';
import { Search, CheckCircle, XCircle, AlertCircle, Shield, FileText, Building2 } from 'lucide-react';

interface VerificationResult {
  verified: boolean;
  businessName: string;
  businessNumber?: string;
  indigenousOwnership?: number;
  verificationDate?: string;
  certifications?: string[];
  warnings?: string[];
  registeredSince?: string;
  totalContracts?: number;
  totalValue?: string;
}

export default function VerificationTool() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  
  const handleVerify = async () => {
    setSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock different results based on search term
      if (searchTerm.toLowerCase().includes('lightning')) {
        setResult({
          verified: true,
          businessName: 'Lightning Construction Ltd',
          businessNumber: '123456789RC0001',
          indigenousOwnership: 100,
          verificationDate: '2024-12-15',
          certifications: ['ISO 9001', 'Indigenous Business Certified'],
          registeredSince: '2019',
          totalContracts: 23,
          totalValue: '$4.2M',
        });
      } else if (searchTerm.toLowerCase().includes('phantom')) {
        setResult({
          verified: false,
          businessName: 'Phantom Indigenous Services',
          warnings: [
            'No Indigenous ownership documentation',
            'Business number not found in registry',
            'Similar name flagged in fraud database',
            'IP address matches known phantom operator',
          ],
        });
      } else {
        setResult({
          verified: true,
          businessName: 'Northern Solutions Inc',
          businessNumber: '987654321RC0001',
          indigenousOwnership: 51,
          verificationDate: '2025-01-10',
          certifications: ['CCAB Certified'],
          registeredSince: '2021',
          totalContracts: 8,
          totalValue: '$1.1M',
        });
      }
      setSearching(false);
    }, 1500);
  };
  
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Enter business name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleVerify}
          disabled={!searchTerm || searching}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
        >
          {searching ? 'Verifying...' : 'Verify'}
        </button>
      </div>
      
      {/* Verification Result */}
      {result && (
        <div className={`border rounded-lg p-6 ${
          result.verified ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                {result.verified ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{result.businessName}</h3>
                  {result.businessNumber && (
                    <p className="text-sm text-gray-600">{result.businessNumber}</p>
                  )}
                </div>
              </div>
            </div>
            {result.verified && <IndigiousVerifiedBadge status="verified" />}
          </div>
          
          {result.verified ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Indigenous Ownership:</span>
                  <p className="font-semibold text-gray-900">{result.indigenousOwnership}%</p>
                </div>
                <div>
                  <span className="text-gray-600">Verified Date:</span>
                  <p className="font-semibold text-gray-900">{result.verificationDate}</p>
                </div>
                <div>
                  <span className="text-gray-600">Member Since:</span>
                  <p className="font-semibold text-gray-900">{result.registeredSince}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Contracts:</span>
                  <p className="font-semibold text-gray-900">{result.totalContracts}</p>
                </div>
              </div>
              
              {result.certifications && (
                <div>
                  <span className="text-sm text-gray-600">Certifications:</span>
                  <div className="flex gap-2 mt-1">
                    {result.certifications.map((cert) => (
                      <span key={cert} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-3 border-t border-green-200">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Safe to proceed with procurement
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-800 font-semibold">
                <AlertCircle className="w-5 h-5" />
                Verification Failed - Do Not Proceed
              </div>
              {result.warnings && (
                <div className="space-y-2">
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-red-700">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t border-red-200">
                <p className="text-sm text-red-800">
                  This supplier cannot be used for Indigenous procurement. Report this attempt to compliance.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">99.9%</div>
          <div className="text-xs text-gray-600">Accuracy Rate</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">2.3s</div>
          <div className="text-xs text-gray-600">Avg Verify Time</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">247</div>
          <div className="text-xs text-gray-600">Frauds Blocked</div>
        </div>
      </div>
    </div>
  );
}