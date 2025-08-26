'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Activity, TrendingUp, Users, MapPin, Clock, XCircle } from 'lucide-react';
import { FraudRiskAssessment } from './cross-province-detector';

interface FraudAlert {
  id: string;
  businessName: string;
  province: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  timestamp: Date;
  flags: string[];
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
}

interface FraudStats {
  totalAssessments: number;
  flaggedToday: number;
  criticalAlerts: number;
  preventedFraud: number;
  commonPatterns: { type: string; count: number }[];
}

const mockAlerts: FraudAlert[] = [
  {
    id: '1',
    businessName: 'Northern Enterprises Ltd',
    province: 'BC',
    riskLevel: 'critical',
    riskScore: 95,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    flags: ['duplicate_band_number', 'banned_individual'],
    status: 'pending',
  },
  {
    id: '2',
    businessName: 'Eagle Construction Services',
    province: 'ON',
    riskLevel: 'high',
    riskScore: 75,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    flags: ['similar_business_different_province', 'high_velocity_same_ip'],
    status: 'reviewing',
  },
  {
    id: '3',
    businessName: 'Traditional Crafts Co',
    province: 'MB',
    riskLevel: 'medium',
    riskScore: 45,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    flags: ['po_box_address', 'new_email_domain'],
    status: 'approved',
  },
];

const mockStats: FraudStats = {
  totalAssessments: 12453,
  flaggedToday: 47,
  criticalAlerts: 3,
  preventedFraud: 156,
  commonPatterns: [
    { type: 'similar_business_different_province', count: 89 },
    { type: 'duplicate_band_number', count: 56 },
    { type: 'high_velocity_registrations', count: 34 },
    { type: 'mismatched_phone_area_code', count: 28 },
    { type: 'banned_individual_connection', count: 12 },
  ],
};

export default function FraudDashboard() {
  const [alerts, setAlerts] = useState<FraudAlert[]>(mockAlerts);
  const [stats, setStats] = useState<FraudStats>(mockStats);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'reviewing': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
  
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.totalAssessments.toLocaleString()}</span>
          </div>
          <p className="text-sm text-gray-600">Total Assessments</p>
          <p className="text-xs text-green-600 mt-1">+12% from last month</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-amber-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.flaggedToday}</span>
          </div>
          <p className="text-sm text-gray-600">Flagged Today</p>
          <p className="text-xs text-amber-600 mt-1">Requires review</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.criticalAlerts}</span>
          </div>
          <p className="text-sm text-gray-600">Critical Alerts</p>
          <p className="text-xs text-red-600 mt-1">Immediate action needed</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.preventedFraud}</span>
          </div>
          <p className="text-sm text-gray-600">Fraud Prevented</p>
          <p className="text-xs text-green-600 mt-1">$2.3M saved</p>
        </div>
      </div>
      
      {/* Active Alerts */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Fraud Alerts</h3>
          <p className="text-sm text-gray-600 mt-1">Review and take action on suspicious registrations</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{alert.businessName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRiskColor(alert.riskLevel)}`}>
                      {alert.riskLevel.toUpperCase()} RISK
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {alert.province}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                    <span>Risk Score: {alert.riskScore}/100</span>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    {alert.flags.slice(0, 3).map((flag) => (
                      <span key={flag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {alert.flags.length > 3 && (
                      <span className="text-xs text-gray-500">+{alert.flags.length - 3} more</span>
                    )}
                  </div>
                </div>
                
                {alert.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle approve
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle reject
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Common Patterns */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Fraud Patterns</h3>
        <div className="space-y-3">
          {stats.commonPatterns.map((pattern) => (
            <div key={pattern.type} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {pattern.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{pattern.count}</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(pattern.count / stats.commonPatterns[0].count) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Fraud Alert Details</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Alert details would go here */}
              <p className="text-gray-600">Detailed fraud analysis and evidence...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}