'use client';

import { FileText, Download, CheckCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';

interface RecentVerification {
  id: string;
  businessName: string;
  verifiedDate: string;
  verifiedBy: string;
  contractValue?: string;
  status: 'verified' | 'pending' | 'flagged';
}

const recentVerifications: RecentVerification[] = [
  {
    id: '1',
    businessName: 'Lightning Construction Ltd',
    verifiedDate: '2025-01-29',
    verifiedBy: 'J. Chen',
    contractValue: '$125,000',
    status: 'verified',
  },
  {
    id: '2',
    businessName: 'Northern IT Solutions',
    verifiedDate: '2025-01-28',
    verifiedBy: 'M. Smith',
    contractValue: '$45,000',
    status: 'verified',
  },
  {
    id: '3',
    businessName: 'Eagle Environmental Services',
    verifiedDate: '2025-01-28',
    verifiedBy: 'Auto-verified',
    contractValue: '$89,000',
    status: 'verified',
  },
  {
    id: '4',
    businessName: 'Suspicious Corp Ltd',
    verifiedDate: '2025-01-27',
    verifiedBy: 'System',
    contractValue: '$250,000',
    status: 'flagged',
  },
];

export default function AuditReports() {
  return (
    <div className="space-y-4">
      {/* Recent Verifications List */}
      <div className="space-y-2">
        {recentVerifications.map((verification) => (
          <div
            key={verification.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              verification.status === 'flagged' 
                ? 'border-red-200 bg-red-50' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                verification.status === 'verified' ? 'bg-green-100' : 
                verification.status === 'flagged' ? 'bg-red-100' : 
                'bg-yellow-100'
              }`}>
                {verification.status === 'verified' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : verification.status === 'flagged' ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{verification.businessName}</p>
                <p className="text-xs text-gray-600">
                  {verification.verifiedDate} • {verification.verifiedBy}
                  {verification.contractValue && ` • ${verification.contractValue}`}
                </p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-sm">
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      
      {/* Audit Stats */}
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-green-900">Audit Readiness</span>
          <IndigiousVerifiedBadge size="sm" status="certified" />
        </div>
        <p className="text-sm text-green-800">
          All verifications are logged with complete audit trail. <span className="font-semibold">100% compliant</span> with 
          Treasury Board requirements.
        </p>
      </div>
    </div>
  );
}