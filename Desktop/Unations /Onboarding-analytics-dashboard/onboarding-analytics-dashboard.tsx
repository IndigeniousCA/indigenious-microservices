import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Clock, CheckCircle, AlertCircle, Target, Zap, Award, Calendar, ArrowUp, ArrowDown, Activity } from 'lucide-react';

const OnboardingAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Mock data - would be real-time in production
  const conversionFunnel = [
    { stage: 'Signups', sellers: 487, subscribers: 43, sellerRate: 100, subscriberRate: 100 },
    { stage: 'Account Verified', sellers: 423, subscribers: 41, sellerRate: 86.8, subscriberRate: 95.3 },
    { stage: 'Payment Connected', sellers: 356, subscribers: 38, sellerRate: 73.1, subscriberRate: 88.4 },
    { stage: 'First Transaction', sellers: 234, subscribers: 35, sellerRate: 48.1, subscriberRate: 81.4 },
    { stage: 'Active (30d)', sellers: 198, subscribers: 33, sellerRate: 40.7, subscriberRate: 76.7 }
  ];

  const timeToValue = [
    { hour: 0, sellers: 0, subscribers: 0 },
    { hour: 1, sellers: 45, subscribers: 0 },
    { hour: 2, sellers: 89, subscribers: 0 },
    { hour: 4, sellers: 134, subscribers: 5 },
    { hour: 8, sellers: 223, subscribers: 12 },
    { hour: 24, sellers: 312, subscribers: 25 },
    { hour: 48, sellers: 367, subscribers: 31 },
    { hour: 72, sellers: 398, subscribers: 35 },
    { hour: 168, sellers: 423, subscribers: 38 }
  ];

  const revenueBySource = [
    { source: 'Transaction Fees', amount: 28750, growth: 23.5 },
    { source: 'Data Bonuses Paid', amount: 3420, growth: 45.2 },
    { source: 'Essential Plans', amount: 75000, growth: 15.0 },
    { source: 'Professional Plans', amount: 300000, growth: 32.1 },
    { source: 'Enterprise Plans', amount: 1000000, growth: 18.7 }
  ];

  const dropoffReasons = [
    { reason: 'Stripe Complexity', count: 67, percentage: 28 },
    { reason: 'Fee Concerns', count: 43, percentage: 18 },
    { reason: 'Documentation Required', count: 38, percentage: 16 },
    { reason: 'Technical Issues', count: 31, percentage: 13 },
    { reason: 'Not Ready Yet', count: 29, percentage: 12 },
    { reason: 'Other', count: 31, percentage: 13 }
  ];

  const onboardingHealth = {
    sellers: {
      score: 82,
      trend: 'up',
      issues: ['Stripe connection', 'Mobile experience'],
      successRate: 40.7
    },
    subscribers: {
      score: 94,
      trend: 'up', 
      issues: ['Contract review time'],
      successRate: 76.7
    }
  };

  const cohortRetention = [
    { cohort: 'Week 1', day1: 100, day7: 72, day14: 58, day30: 41, day60: 35, day90: 32 },
    { cohort: 'Week 2', day1: 100, day7: 75, day14: 61, day30: 44, day60: 38, day90: 34 },
    { cohort: 'Week 3', day1: 100, day7: 78, day14: 64, day30: 47, day60: 41, day90: null },
    { cohort: 'Week 4', day1: 100, day7: 81, day14: 67, day30: 49, day60: null, day90: null },
    { cohort: 'Week 5', day1: 100, day7: 83, day14: 69, day30: null, day60: null, day90: null }
  ];

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  const MetricCard = ({ title, value, change, trend, icon: Icon, color = 'blue' }) => {
    const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
    const TrendIcon = trend === 'up' ? ArrowUp : ArrowDown;
    
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
          <div className={`flex items-center gap-1 ${trendColor} text-sm font-medium`}>
            <TrendIcon className="w-4 h-4" />
            {Math.abs(change)}%
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-600 mt-1">{title}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Onboarding Analytics</h1>
            <p className="text-gray-600">Real-time insights into customer activation</p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Signups"
          value="530"
          change={28.5}
          trend="up"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Activation Rate"
          value="44.2%"
          change={5.3}
          trend="up"
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Time to First Transaction"
          value="4.2 hrs"
          change={-12.5}
          trend="up"
          icon={Clock}
          color="purple"
        />
        <MetricCard
          title="Revenue from New Users"
          value="$142K"
          change={35.7}
          trend="up"
          icon={DollarSign}
          color="yellow"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Conversion Funnel */}
        <div className="col-span-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Conversion Funnel</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionFunnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" angle={-20} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sellers" fill="#3B82F6" name="Marketplace Sellers" />
                <Bar dataKey="subscribers" fill="#8B5CF6" name="Intelligence Subscribers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Seller Conversion</span>
                <span className="text-2xl font-bold text-blue-600">40.7%</span>
              </div>
              <div className="text-sm text-gray-600">Signup → Active in 30 days</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Subscriber Conversion</span>
                <span className="text-2xl font-bold text-purple-600">76.7%</span>
              </div>
              <div className="text-sm text-gray-600">Demo → Paying customer</div>
            </div>
          </div>
        </div>

        {/* Onboarding Health Score */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Onboarding Health</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Marketplace Sellers</span>
                <span className="text-sm text-gray-600">{onboardingHealth.sellers.score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${onboardingHealth.sellers.score}%` }}
                />
              </div>
              <div className="mt-2 space-y-1">
                {onboardingHealth.sellers.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    {issue}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Intelligence Subscribers</span>
                <span className="text-sm text-gray-600">{onboardingHealth.subscribers.score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full transition-all"
                  style={{ width: `${onboardingHealth.subscribers.score}%` }}
                />
              </div>
              <div className="mt-2 space-y-1">
                {onboardingHealth.subscribers.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Overall improving</span>
            </div>
            <p className="text-sm text-green-600 mt-1">+5.3% vs last period</p>
          </div>
        </div>

        {/* Time to Value */}
        <div className="col-span-7 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Time to First Value</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeToValue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: 'Hours after signup', position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="sellers" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Sellers" />
                <Area type="monotone" dataKey="subscribers" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} name="Subscribers" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">4.2 hrs</div>
              <div className="text-sm text-gray-600">Avg. to first transaction</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">2.8 days</div>
              <div className="text-sm text-gray-600">Avg. to subscription</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">87%</div>
              <div className="text-sm text-gray-600">Active within 7 days</div>
            </div>
          </div>
        </div>

        {/* Drop-off Analysis */}
        <div className="col-span-5 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Drop-off Reasons</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dropoffReasons}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ reason, percentage }) => `${reason} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {dropoffReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Drop-offs</span>
              <span>239 users</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Recovery Rate</span>
              <span className="text-green-600">23% return within 30d</span>
            </div>
          </div>
        </div>

        {/* Revenue Impact */}
        <div className="col-span-12 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Revenue Impact from New Users</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total this period:</span>
              <span className="text-2xl font-bold text-green-600">$1.41M</span>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-4 mb-6">
            {revenueBySource.map((source, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{source.source}</div>
                <div className="text-xl font-bold">${(source.amount / 1000).toFixed(0)}K</div>
                <div className={`text-sm flex items-center gap-1 mt-1 ${source.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {source.growth > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {source.growth}%
                </div>
              </div>
            ))}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip formatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Bar dataKey="amount" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cohort Retention */}
        <div className="col-span-12 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Cohort Retention Analysis</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Cohort</th>
                  <th className="text-center py-3 px-4">Day 1</th>
                  <th className="text-center py-3 px-4">Day 7</th>
                  <th className="text-center py-3 px-4">Day 14</th>
                  <th className="text-center py-3 px-4">Day 30</th>
                  <th className="text-center py-3 px-4">Day 60</th>
                  <th className="text-center py-3 px-4">Day 90</th>
                </tr>
              </thead>
              <tbody>
                {cohortRetention.map((cohort, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 px-4 font-medium">{cohort.cohort}</td>
                    <td className="text-center py-3 px-4">
                      <div className="inline-flex items-center justify-center w-16 h-8 bg-green-100 text-green-700 rounded font-medium">
                        {cohort.day1}%
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className={`inline-flex items-center justify-center w-16 h-8 rounded font-medium ${
                        cohort.day7 >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {cohort.day7}%
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className={`inline-flex items-center justify-center w-16 h-8 rounded font-medium ${
                        cohort.day14 >= 60 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {cohort.day14}%
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      {cohort.day30 !== null ? (
                        <div className={`inline-flex items-center justify-center w-16 h-8 rounded font-medium ${
                          cohort.day30 >= 40 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {cohort.day30}%
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {cohort.day60 !== null ? (
                        <div className={`inline-flex items-center justify-center w-16 h-8 rounded font-medium ${
                          cohort.day60 >= 35 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {cohort.day60}%
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {cohort.day90 !== null ? (
                        <div className={`inline-flex items-center justify-center w-16 h-8 rounded font-medium ${
                          cohort.day90 >= 30 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {cohort.day90}%
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Day 7 Target</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">75%</div>
              <div className="text-sm text-gray-600">Current avg: 77.8% ✓</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Day 30 Target</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">45%</div>
              <div className="text-sm text-gray-600">Current avg: 45.3% ✓</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="font-medium">Day 90 Target</span>
              </div>
              <div className="text-2xl font-bold text-green-600">30%</div>
              <div className="text-sm text-gray-600">Current avg: 33% ✓</div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="col-span-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Recommended Actions</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Optimize Stripe Flow</span>
              </div>
              <p className="text-sm text-blue-100">28% of sellers drop at payment setup. Consider embedded Stripe onboarding.</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Reduce Time to Value</span>
              </div>
              <p className="text-sm text-blue-100">Sellers who transact within 4 hours have 3x higher retention.</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5" />
                <span className="font-medium">Expand Data Bonuses</span>
              </div>
              <p className="text-sm text-blue-100">Sellers earning >$5 in bonuses show 92% 30-day retention.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingAnalyticsDashboard;