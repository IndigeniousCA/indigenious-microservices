'use client';

import { BarChart3, TrendingUp, Users, DollarSign, Briefcase, GraduationCap } from 'lucide-react';

interface ImpactMetric {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

const impactMetrics: ImpactMetric[] = [
  {
    label: 'Indigenous Employment',
    value: '234',
    change: '+18%',
    icon: <Users className="w-5 h-5" />,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    label: 'Community Investment',
    value: '$12.4M',
    change: '+24%',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'text-green-600 bg-green-100',
  },
  {
    label: 'Local Procurement',
    value: '$8.7M',
    change: '+45%',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    label: 'Training Programs',
    value: '156',
    change: '+12',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'text-amber-600 bg-amber-100',
  },
];

export default function ImpactReporting() {
  return (
    <div className="space-y-4">
      {/* Impact Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {impactMetrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <div className={`p-2 rounded-lg ${metric.color.split(' ')[1]}`}>
                <div className={metric.color.split(' ')[0]}>
                  {metric.icon}
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600">
                {metric.change}
              </span>
            </div>
            <div className="text-lg font-bold text-gray-900">{metric.value}</div>
            <div className="text-xs text-gray-600">{metric.label}</div>
          </div>
        ))}
      </div>
      
      {/* Impact Story */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          ESG Impact Score: A-
        </h4>
        <p className="text-sm text-gray-700 mb-3">
          Your Indigenous partnerships have created <span className="font-semibold">234 direct jobs</span> and 
          supported <span className="font-semibold">450+ indirect jobs</span> in surrounding communities. 
          This exceeds industry average by <span className="font-semibold text-green-600">320%</span>.
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Next milestone:</span>
          <span className="font-semibold text-blue-600">250 Indigenous employees</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full" style={{ width: '93%' }}></div>
        </div>
      </div>
      
      {/* Investor Message */}
      <div className="p-3 bg-amber-50 rounded-lg">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">📊 Investor Update:</span> Your Indigenous impact metrics 
          qualify for <span className="font-semibold">ESG preferred rates</span> with 3 major funds, 
          potentially saving <span className="font-semibold">0.5%</span> on your next financing round.
        </p>
      </div>
    </div>
  );
}