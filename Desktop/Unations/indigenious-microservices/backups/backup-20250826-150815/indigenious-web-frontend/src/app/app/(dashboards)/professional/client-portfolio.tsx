'use client';

import { useState } from 'react';
import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';
import { TrendingUp, Clock, DollarSign, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface Client {
  id: string;
  businessName: string;
  contactName: string;
  status: 'active' | 'onboarding' | 'paused';
  verified: boolean;
  monthlyRetainer: number;
  activeBids: number;
  successRate: number;
  nextMilestone: string;
  riskFactors?: string[];
}

const mockClients: Client[] = [
  {
    id: '1',
    businessName: 'Lightning Construction',
    contactName: 'Sarah Lightning',
    status: 'active',
    verified: true,
    monthlyRetainer: 5000,
    activeBids: 3,
    successRate: 87,
    nextMilestone: 'DND contract submission',
    riskFactors: ['First federal contract'],
  },
  {
    id: '2',
    businessName: 'Northern Tech Solutions',
    contactName: 'Michael Bearpaw',
    status: 'active',
    verified: true,
    monthlyRetainer: 3500,
    activeBids: 2,
    successRate: 92,
    nextMilestone: 'Compliance review',
  },
  {
    id: '3',
    businessName: 'Eagle Environmental',
    contactName: 'Jennifer Eagle',
    status: 'onboarding',
    verified: false,
    monthlyRetainer: 4000,
    activeBids: 0,
    successRate: 0,
    nextMilestone: 'Verification completion',
    riskFactors: ['Pending verification', 'New to procurement'],
  },
];

export default function ClientPortfolio() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'onboarding': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const totalMonthlyRevenue = mockClients.reduce((sum, client) => sum + client.monthlyRetainer, 0);
  const activeClients = mockClients.filter(c => c.status === 'active').length;
  
  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Monthly Recurring</p>
          <p className="text-lg font-bold text-gray-900">${totalMonthlyRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Active Clients</p>
          <p className="text-lg font-bold text-gray-900">{activeClients} of {mockClients.length}</p>
        </div>
      </div>
      
      {/* Client List */}
      <div className="space-y-3">
        {mockClients.map((client) => (
          <div
            key={client.id}
            className="border border-gray-200 rounded-lg p-3 hover:border-indigo-500 transition-colors cursor-pointer"
            onClick={() => setSelectedClient(client)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{client.businessName}</h4>
                  {client.verified && <IndigiousVerifiedBadge size="sm" />}
                </div>
                <p className="text-sm text-gray-600">{client.contactName}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(client.status)}`}>
                {client.status}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Retainer:</span>
                <p className="font-semibold">${client.monthlyRetainer}/mo</p>
              </div>
              <div>
                <span className="text-gray-600">Active Bids:</span>
                <p className="font-semibold">{client.activeBids}</p>
              </div>
              <div>
                <span className="text-gray-600">Success:</span>
                <p className="font-semibold">{client.successRate}%</p>
              </div>
            </div>
            
            {client.riskFactors && client.riskFactors.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-600">
                  {client.riskFactors.join(', ')}
                </span>
              </div>
            )}
            
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              <span>Next: {client.nextMilestone}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <button className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200">
            Schedule Check-in
          </button>
          <button className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200">
            Create Proposal
          </button>
          <button className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200">
            Run Compliance Check
          </button>
        </div>
      </div>
    </div>
  );
}