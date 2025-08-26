'use client';

import { TrendingUp, TrendingDown, DollarSign, Users, Target, Calendar } from 'lucide-react';

interface RevenueMetric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

const revenueMetrics: RevenueMetric[] = [
  {
    label: 'This Month',
    value: '$47,500',
    change: 22,
    trend: 'up',
  },
  {
    label: 'Last Month',
    value: '$38,900',
    change: -5,
    trend: 'down',
  },
  {
    label: 'Avg per Client',
    value: '$1,979',
    change: 8,
    trend: 'up',
  },
  {
    label: 'Pipeline Value',
    value: '$125,000',
    change: 45,
    trend: 'up',
  },
];

interface TopClient {
  name: string;
  revenue: number;
  percentage: number;
}

const topClients: TopClient[] = [
  { name: 'Lightning Construction', revenue: 12000, percentage: 25 },
  { name: 'Northern Tech Solutions', revenue: 8500, percentage: 18 },
  { name: 'Eagle Environmental', revenue: 7200, percentage: 15 },
  { name: 'Traditional Crafts Co', revenue: 5800, percentage: 12 },
  { name: 'Others (8 clients)', revenue: 14000, percentage: 30 },
];

export default function RevenueTracker() {
  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : trend === 'down' ? (
      <TrendingDown className="w-4 h-4 text-red-600" />
    ) : null;
  };
  
  const getTrendColor = (trend: string, change: number) => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };
  
  return (
    <div className="space-y-4">
      {/* Revenue Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {revenueMetrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">{metric.label}</span>
              {getTrendIcon(metric.trend)}
            </div>
            <div className="text-lg font-bold text-gray-900">{metric.value}</div>
            <div className={`text-xs ${getTrendColor(metric.trend, metric.change)}`}>
              {metric.change > 0 ? '+' : ''}{metric.change}% vs prev
            </div>
          </div>
        ))}
      </div>
      
      {/* Revenue by Client */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Revenue Distribution</h4>
        <div className="space-y-2">
          {topClients.map((client, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-gray-700">{client.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  ${client.revenue.toLocaleString()}
                </span>
                <div className="w-20">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${client.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Service Performance */}
      <div className="pt-3 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Service Performance</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">RFP Writing</span>
            <span className="font-semibold text-gray-900">$22,500 (47%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Compliance Consulting</span>
            <span className="font-semibold text-gray-900">$15,200 (32%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Strategic Advisory</span>
            <span className="font-semibold text-gray-900">$9,800 (21%)</span>
          </div>
        </div>
      </div>
      
      {/* Growth Insight */}
      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-purple-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-900">
              On track for $570K annual revenue
            </p>
            <p className="text-xs text-purple-700 mt-1">
              Add 3 more clients at current rate to reach $750K target.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}