'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Indigenous Procurement Platform - Demo</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <h2 className="text-lg font-medium text-blue-800">Welcome to Demo Mode!</h2>
              <p className="mt-1 text-sm text-blue-700">
                All features are fully functional with mock data. No real bank connections or external services required.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {['overview', 'bank-integration', 'network-effects', 'compliance'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">🏦 Bank Integration</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ Scotia TranXact API integration</li>
                      <li>✓ Virtual account management</li>
                      <li>✓ Real-time transaction monitoring</li>
                      <li>✓ Multi-factor authentication</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">🔒 Security Features</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ SOC 2 Type II compliance</li>
                      <li>✓ Certificate pinning</li>
                      <li>✓ Fraud detection system</li>
                      <li>✓ Encrypted Redis cache</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">📊 Network Effects</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ NFX 16 types tracking</li>
                      <li>✓ Growth projections</li>
                      <li>✓ Community impact metrics</li>
                      <li>✓ Defensibility scoring</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">📈 Monitoring</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ Performance monitoring</li>
                      <li>✓ Distributed tracing</li>
                      <li>✓ Compliance reporting</li>
                      <li>✓ Disaster recovery</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bank-integration' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Integration Module</h3>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-sm text-yellow-700">
                      Demo Mode: Using mock Scotia TranXact API. All operations are simulated.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Create Virtual Account
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                      Check Balance
                    </button>
                    <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                      View Transactions
                    </button>
                    <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
                      Test MFA Flow
                    </button>
                  </div>
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">No recent activity in demo mode.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'network-effects' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">NFX Network Effects</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Two-Sided', score: 85, status: 'Strong' },
                    { name: 'Tribal', score: 92, status: 'Very Strong' },
                    { name: 'Local', score: 78, status: 'Good' },
                    { name: 'Data', score: 65, status: 'Growing' },
                    { name: 'Social', score: 71, status: 'Good' },
                    { name: 'Platform', score: 45, status: 'Emerging' }
                  ].map((effect) => (
                    <div key={effect.name} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{effect.name} Network Effect</h4>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Strength</span>
                          <span className="font-medium">{effect.score}%</span>
                        </div>
                        <div className="mt-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${effect.score}%` }}
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-600">Status: {effect.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Dashboard</h3>
                <div className="space-y-6">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <h4 className="text-lg font-medium text-green-800">SOC 2 Type II Compliant</h4>
                    <p className="mt-1 text-sm text-green-700">
                      All systems meet or exceed SOC 2 requirements
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">99.9%</div>
                      <div className="text-sm text-gray-600">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">100%</div>
                      <div className="text-sm text-gray-600">Encryption</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">95%</div>
                      <div className="text-sm text-gray-600">MFA Adoption</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">0</div>
                      <div className="text-sm text-gray-600">Security Incidents</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recent Compliance Scans</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">All scans passed. Next scan scheduled in 24 hours.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/features/bank-integration" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <h3 className="font-medium text-gray-900 mb-2">Bank Integration Docs</h3>
            <p className="text-sm text-gray-600">Learn about our secure bank API integrations</p>
          </Link>
          <Link href="/features/network-effects" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <h3 className="font-medium text-gray-900 mb-2">Network Effects Guide</h3>
            <p className="text-sm text-gray-600">Understand how network effects drive growth</p>
          </Link>
          <Link href="/features/compliance" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <h3 className="font-medium text-gray-900 mb-2">Security & Compliance</h3>
            <p className="text-sm text-gray-600">Review our security measures and certifications</p>
          </Link>
        </div>
      </main>
    </div>
  );
}