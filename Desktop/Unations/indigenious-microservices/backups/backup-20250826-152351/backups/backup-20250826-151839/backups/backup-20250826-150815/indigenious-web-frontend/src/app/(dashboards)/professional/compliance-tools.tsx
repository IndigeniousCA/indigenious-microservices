'use client';

import { Shield, CheckCircle, AlertTriangle, FileCheck, RefreshCw, Download } from 'lucide-react';

interface ComplianceCheck {
  category: string;
  status: 'passed' | 'warning' | 'failed';
  lastChecked: string;
  issues: number;
  items: string[];
}

const complianceChecks: ComplianceCheck[] = [
  {
    category: 'Indigenous Verification',
    status: 'passed',
    lastChecked: '2 days ago',
    issues: 0,
    items: ['Band membership', 'Ownership structure', 'Territory confirmation'],
  },
  {
    category: 'Federal Requirements',
    status: 'warning',
    lastChecked: '1 week ago',
    issues: 2,
    items: ['Security clearance', 'Controlled goods', 'ITAR compliance'],
  },
  {
    category: 'Provincial Licensing',
    status: 'passed',
    lastChecked: '3 days ago',
    issues: 0,
    items: ['Business license', 'Professional permits', 'Trade certifications'],
  },
  {
    category: 'Financial Standing',
    status: 'warning',
    lastChecked: '5 days ago',
    issues: 1,
    items: ['Bonding capacity', 'Insurance coverage', 'Credit rating'],
  },
];

export default function ComplianceTools() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'failed':
        return <Shield className="w-5 h-5 text-red-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'failed': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">18</div>
          <div className="text-xs text-gray-600">Compliant</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">3</div>
          <div className="text-xs text-gray-600">Warnings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">0</div>
          <div className="text-xs text-gray-600">Critical</div>
        </div>
      </div>
      
      {/* Compliance Checks */}
      <div className="space-y-2">
        {complianceChecks.map((check, index) => (
          <div
            key={index}
            className={`border rounded-lg p-3 ${getStatusColor(check.status)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(check.status)}
                <h4 className="font-semibold text-gray-900">{check.category}</h4>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Last checked: {check.lastChecked}</span>
              {check.issues > 0 && (
                <span className="text-amber-600 font-semibold">{check.issues} issues</span>
              )}
            </div>
            
            <div className="text-xs text-gray-700">
              {check.items.join(' • ')}
            </div>
          </div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
            <FileCheck className="w-4 h-4" />
            Run Full Audit
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 text-sm bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>
      
      {/* Compliance Score */}
      <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-indigo-900">Overall Compliance Score</span>
          <span className="text-2xl font-bold text-indigo-600">94%</span>
        </div>
        <div className="w-full bg-indigo-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '94%' }}></div>
        </div>
        <p className="text-xs text-indigo-700 mt-2">
          Above industry average. Address 3 warnings to reach 100%.
        </p>
      </div>
    </div>
  );
}