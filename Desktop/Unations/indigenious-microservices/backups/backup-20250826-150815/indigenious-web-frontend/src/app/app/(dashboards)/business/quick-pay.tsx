'use client';

import { useState } from 'react';
import { DollarSign, Clock, CheckCircle, AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { BrandCTA } from '@/lib/brand/brand-components';

interface Payment {
  id: string;
  contractName: string;
  client: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'available';
  dueDate?: string;
  paymentDate?: string;
  daysUntilPayment?: number;
}

const mockPayments: Payment[] = [
  {
    id: '1',
    contractName: 'Website Redesign Phase 2',
    client: 'Public Services Canada',
    amount: 45000,
    status: 'available',
    daysUntilPayment: 0,
  },
  {
    id: '2',
    contractName: 'IT Support Services - March',
    client: 'Health Canada',
    amount: 28500,
    status: 'processing',
    daysUntilPayment: 1,
  },
  {
    id: '3',
    contractName: 'Security Audit Q1',
    client: 'Transport Canada',
    amount: 35000,
    status: 'pending',
    dueDate: '2025-02-05',
    daysUntilPayment: 7,
  },
  {
    id: '4',
    contractName: 'Database Migration',
    client: 'Environment Canada',
    amount: 62000,
    status: 'completed',
    paymentDate: '2025-01-28',
  },
];

export default function QuickPayDashboard() {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  const totalPending = mockPayments
    .filter(p => ['pending', 'processing', 'available'].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);
  
  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-amber-600 bg-amber-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'available': return <Zap className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Total Pending */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-emerald-700">Total Pending</span>
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900">${totalPending.toLocaleString()}</div>
        <p className="text-sm text-gray-600 mt-1">
          Get paid in <span className="font-semibold text-emerald-600">24 hours</span> instead of 90 days
        </p>
      </div>
      
      {/* Payment List */}
      <div className="space-y-2">
        {mockPayments.map((payment) => (
          <div
            key={payment.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              payment.status === 'available' 
                ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedPayment(payment)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{payment.contractName}</h4>
                <p className="text-sm text-gray-600">{payment.client}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">${payment.amount.toLocaleString()}</p>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                  {getStatusIcon(payment.status)}
                  <span className="capitalize">{payment.status}</span>
                </div>
              </div>
            </div>
            
            {payment.status === 'available' && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-green-700 font-semibold">Ready for instant payment!</span>
                <BrandCTA size="sm" variant="primary">Get Paid Now</BrandCTA>
              </div>
            )}
            
            {payment.daysUntilPayment !== undefined && payment.status !== 'available' && (
              <div className="mt-2 text-xs text-gray-500">
                Payment in {payment.daysUntilPayment} {payment.daysUntilPayment === 1 ? 'day' : 'days'}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">24hr</div>
          <div className="text-xs text-gray-600">Avg Payment</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">$2.1M</div>
          <div className="text-xs text-gray-600">Total Earned</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">66</div>
          <div className="text-xs text-gray-600">Days Saved</div>
        </div>
      </div>
      
      {/* Value Message */}
      <div className="bg-emerald-100 rounded-lg p-3">
        <p className="text-sm text-emerald-800">
          <span className="font-semibold">💰 You've saved $126,000</span> in interest and operating costs 
          by getting paid faster through Indigenious!
        </p>
      </div>
    </div>
  );
}