import { redirect } from 'next/navigation';
import { detectUserType } from '@/app/actions/detect-user-type';
import { UserType } from '@/lib/brand/brand-config';
import { ContentAdaptationEngine } from '@/lib/brand/content-strategy';
import {
  IndigiousLogo,
  IndigiousVerifiedBadge,
  BrandCTA,
} from '@/lib/brand/brand-components';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Map,
  DollarSign,
  FileText,
  BarChart3,
  Building2,
  Handshake,
  Activity,
  Target
} from 'lucide-react';
import Link from 'next/link';

// Mining-specific components
import CommunityRelationsTracker from './community-relations';
import SupplierDiscovery from './supplier-discovery';
import ImpactReporting from './impact-reporting';
import ConsultationTracker from './consultation-tracker';

// Force dynamic rendering due to cookie usage in detectUserType
export const dynamic = 'force-dynamic';

export default async function MiningDashboard() {
  // Verify user is a mining executive
  const { userType } = await detectUserType();
  
  // Redirect if not authorized (in production, check actual auth)
  if (userType !== UserType.MINING_EXECUTIVE && process.env.NODE_ENV === 'production') {
    redirect('/');
  }
  
  // Get dashboard content
  const dashboardContent = ContentAdaptationEngine.getDashboardContent(UserType.MINING_EXECUTIVE);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <IndigiousLogo size="sm" />
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/mining" className="text-gray-900 font-semibold">Dashboard</Link>
                <Link href="/mining/communities" className="text-gray-600 hover:text-gray-900">Communities</Link>
                <Link href="/mining/suppliers" className="text-gray-600 hover:text-gray-900">Suppliers</Link>
                <Link href="/mining/impact" className="text-gray-600 hover:text-gray-900">Impact</Link>
                <Link href="/mining/compliance" className="text-gray-600 hover:text-gray-900">Compliance</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Activity className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-semibold">
                MC
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dashboardContent.title}</h1>
          <p className="text-gray-600 mt-2">{dashboardContent.subtitle}</p>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {dashboardContent.metrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{metric.label}</span>
                {metric.trend && (
                  <span className={`text-sm font-semibold ${
                    metric.trend === 'stable' ? 'text-blue-600' :
                    metric.trend.startsWith('+') ? 'text-green-600' :
                    metric.trend === 'warning' ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    {metric.trend}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
            </div>
          ))}
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {dashboardContent.quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:border-amber-500 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="font-medium text-gray-900">{action.label}</span>
            </Link>
          ))}
        </div>
        
        {/* Main Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Community Relations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Community Relations</h2>
              <BrandCTA href="/mining/communities" size="sm" variant="ghost">
                View All
              </BrandCTA>
            </div>
            <CommunityRelationsTracker />
          </div>
          
          {/* Risk Assessment */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Risk Assessment</h2>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                Low Risk
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Social License Status</span>
                </div>
                <span className="text-green-600 font-semibold">Strong</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Community Support</span>
                </div>
                <span className="text-blue-600 font-semibold">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-gray-700">Outstanding Issues</span>
                </div>
                <span className="text-amber-600 font-semibold">2</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">ESG Compliance</span>
                </div>
                <span className="text-purple-600 font-semibold">92%</span>
              </div>
            </div>
          </div>
          
          {/* Supplier Discovery */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Indigenous Suppliers</h2>
              <BrandCTA href="/mining/suppliers" size="sm" variant="ghost">
                Find More
              </BrandCTA>
            </div>
            <SupplierDiscovery />
          </div>
          
          {/* Impact Dashboard */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Community Impact</h2>
              <BrandCTA href="/mining/impact" size="sm" variant="ghost">
                Full Report
              </BrandCTA>
            </div>
            <ImpactReporting />
          </div>
        </div>
        
        {/* Consultation Tracker */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Consultation Activities</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Compliance Rate:</span>
              <span className="text-2xl font-bold text-green-600">100%</span>
            </div>
          </div>
          <ConsultationTracker />
        </div>
        
        {/* Network Value Proposition */}
        <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Avoid the Next $15M Blockade
            </h3>
            <p className="text-gray-700 mb-6">
              Join 127 mining companies already using Indigenious to build authentic partnerships 
              that turn potential opposition into active support. Our network gives you instant access 
              to verified suppliers, real-time community sentiment, and proven partnership models.
            </p>
            <div className="flex items-center gap-6">
              <BrandCTA href="/mining/demo" variant="primary" size="lg">
                See Full Capabilities
              </BrandCTA>
              <Link href="/mining/case-studies" className="text-amber-700 hover:text-amber-800 font-semibold">
                View Success Stories →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}