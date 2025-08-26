import { redirect } from 'next/navigation';
import { detectUserType } from '@/app/actions/detect-user-type';
import { UserType } from '@/lib/brand/brand-config';
import { ContentAdaptationEngine } from '@/lib/brand/content-strategy';
import {
  IndigiousLogo,
  BrandCTA,
} from '@/lib/brand/brand-components';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  FileText,
  Search,
  BarChart3,
  Target,
  Building2,
  Users,
  Activity,
  Download
} from 'lucide-react';
import Link from 'next/link';

// Government-specific components
import VerificationTool from './verification-tool';
import ComplianceTracker from './compliance-tracker';
import AuditReports from './audit-reports';
import SupplierSearch from './supplier-search';

// Force dynamic rendering due to cookie usage in detectUserType
export const dynamic = 'force-dynamic';

export default async function GovernmentDashboard() {
  // Verify user is a government procurement officer
  const { userType } = await detectUserType();
  
  // Redirect if not authorized (in production, check actual auth)
  if (userType !== UserType.GOVERNMENT_PROCUREMENT && process.env.NODE_ENV === 'production') {
    redirect('/');
  }
  
  // Get dashboard content
  const dashboardContent = ContentAdaptationEngine.getDashboardContent(UserType.GOVERNMENT_PROCUREMENT);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <IndigiousLogo size="sm" />
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/government" className="text-gray-900 font-semibold">Dashboard</Link>
                <Link href="/government/verify" className="text-gray-600 hover:text-gray-900">Verify</Link>
                <Link href="/government/suppliers" className="text-gray-600 hover:text-gray-900">Suppliers</Link>
                <Link href="/government/compliance" className="text-gray-600 hover:text-gray-900">Compliance</Link>
                <Link href="/government/reports" className="text-gray-600 hover:text-gray-900">Reports</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Activity className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                JC
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
        
        {/* Alert Banner */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Treasury Board Directive Update</p>
            <p className="text-sm text-amber-800 mt-1">
              New compliance requirements take effect March 31st. Ensure all suppliers are verified through 
              Indigenious to meet audit requirements.
            </p>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {dashboardContent.metrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{metric.label}</span>
                {metric.trend && (
                  <span className={`text-sm font-semibold ${
                    metric.trend === 'warning' ? 'text-amber-600' :
                    metric.trend.startsWith('+') ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                    {metric.trend}
                  </span>
                )}
              </div>
              <div className={`text-2xl font-bold ${
                metric.label === 'Compliance Status' && metric.value === 'Below Target' 
                  ? 'text-red-600' 
                  : 'text-gray-900'
              }`}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {dashboardContent.quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-500 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="font-medium text-gray-900">{action.label}</span>
            </Link>
          ))}
        </div>
        
        {/* Main Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Verification Tool */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Instant Verification</h2>
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <VerificationTool />
          </div>
          
          {/* Compliance Tracker */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">5% Target Tracker</h2>
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <ComplianceTracker />
          </div>
          
          {/* Recent Verifications */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Verifications</h2>
              <BrandCTA href="/government/history" size="sm" variant="ghost">
                View All
              </BrandCTA>
            </div>
            <AuditReports />
          </div>
          
          {/* Supplier Search */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Find Suppliers</h2>
              <BrandCTA href="/government/suppliers" size="sm" variant="ghost">
                Advanced Search
              </BrandCTA>
            </div>
            <SupplierSearch />
          </div>
        </div>
        
        {/* Compliance Alert */}
        <div className="mt-8 bg-red-50 rounded-xl p-6 border border-red-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                Action Required: Below 5% Target
              </h3>
              <p className="text-red-800 mb-4">
                Your department is currently at 4.2% Indigenous procurement, below the mandatory 5% target. 
                You need to award an additional <span className="font-semibold">$1.2M</span> in contracts 
                to Indigenous businesses by fiscal year end.
              </p>
              <div className="flex items-center gap-4">
                <BrandCTA href="/government/suppliers?ready=true" variant="primary" size="sm">
                  Find Contract-Ready Suppliers
                </BrandCTA>
                <Link href="/government/strategy" className="text-red-700 hover:text-red-800 font-semibold text-sm">
                  View Compliance Strategy →
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Network Value Proposition */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Never Face Another Procurement Scandal
            </h3>
            <p className="text-gray-700 mb-6">
              Join 342 government departments already using Indigenious for bulletproof verification. 
              Our AI-powered system has prevented <span className="font-semibold">100% of phantom 
              supplier attempts</span> with zero false positives.
            </p>
            <div className="flex items-center gap-6">
              <BrandCTA href="/government/demo" variant="primary" size="lg">
                See Security Features
              </BrandCTA>
              <Link href="/government/case-studies" className="text-blue-700 hover:text-blue-800 font-semibold">
                Read Success Stories →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}