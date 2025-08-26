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
  DollarSign, 
  Clock, 
  Users, 
  TrendingUp,
  FileText,
  Zap,
  Trophy,
  ArrowRight,
  Bell,
  Star,
  Activity,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

// Business-specific components
import QuickPayDashboard from './quick-pay';
import PartnerMatcher from './partner-matcher';
import BidAssistant from './bid-assistant';
import VerificationStatus from './verification-status';
import { VerificationWidget } from '@/features/verification-monopoly/verification-widget';

// Force dynamic rendering due to cookie usage in detectUserType
export const dynamic = 'force-dynamic';

export default async function BusinessDashboard() {
  // Verify user is an Indigenous business
  const { userType } = await detectUserType();
  
  // Redirect if not authorized (in production, check actual auth)
  if (userType !== UserType.INDIGENOUS_BUSINESS && process.env.NODE_ENV === 'production') {
    redirect('/');
  }
  
  // Get dashboard content
  const dashboardContent = ContentAdaptationEngine.getDashboardContent(UserType.INDIGENOUS_BUSINESS);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <IndigiousLogo size="sm" />
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/business" className="text-gray-900 font-semibold">Dashboard</Link>
                <Link href="/business/payments" className="text-gray-600 hover:text-gray-900">Payments</Link>
                <Link href="/business/opportunities" className="text-gray-600 hover:text-gray-900">Opportunities</Link>
                <Link href="/business/partners" className="text-gray-600 hover:text-gray-900">Partners</Link>
                <Link href="/business/bids" className="text-gray-600 hover:text-gray-900">My Bids</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                SL
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dashboardContent.title}</h1>
          <p className="text-gray-600 mt-2">{dashboardContent.subtitle}</p>
        </div>
        
        {/* Success Alert */}
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <Trophy className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">You're in the top 10% of earners!</p>
            <p className="text-sm text-emerald-800 mt-1">
              Your average payment time is 24 hours vs industry average of 90 days. Keep winning those contracts!
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
                    metric.trend === 'active' ? 'text-emerald-600' :
                    metric.trend === 'new' ? 'text-blue-600' :
                    metric.trend.startsWith('+') ? 'text-green-600' :
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
              className="bg-white rounded-xl p-4 border border-gray-200 hover:border-emerald-500 transition-colors flex items-center gap-3 group"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="font-medium text-gray-900 group-hover:text-emerald-600">{action.label}</span>
            </Link>
          ))}
        </div>
        
        {/* Main Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Pay Dashboard */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">24-Hour Payments</h2>
              </div>
              <BrandCTA href="/business/payments" size="sm" variant="ghost">
                View All
              </BrandCTA>
            </div>
            <QuickPayDashboard />
          </div>
          
          {/* New Opportunities */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Hot Opportunities</h2>
              </div>
              <BrandCTA href="/business/opportunities" size="sm" variant="ghost">
                See All
              </BrandCTA>
            </div>
            <div className="space-y-3">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">IT Infrastructure Upgrade</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Perfect Match
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Public Services Canada</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">$125,000 - $200,000</span>
                  <span className="text-xs text-gray-500">Closes in 5 days</span>
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Network Security Assessment</h3>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                    Good Fit
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Department of National Defence</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">$75,000 - $100,000</span>
                  <span className="text-xs text-gray-500">Closes in 8 days</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Partner Finder */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Find Partners</h2>
              </div>
              <BrandCTA href="/business/partners" size="sm" variant="ghost">
                Browse All
              </BrandCTA>
            </div>
            <PartnerMatcher />
          </div>
          
          {/* AI Bid Assistant */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">AI Bid Assistant</h2>
              </div>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                NEW
              </span>
            </div>
            <BidAssistant />
          </div>
        </div>
        
        {/* Verification Status */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Verification Status</h2>
            <IndigiousVerifiedBadge status="verified" />
          </div>
          <VerificationStatus />
          
          {/* Show how the verification widget looks to others */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">How others see your verification:</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <VerificationWidget 
                businessId="sample-lightning-construction"
                size="lg"
                showDetails={true}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              This verification badge is displayed on all government and partner sites, 
              proving your Indigenous business status instantly.
            </p>
          </div>
        </div>
        
        {/* Growth Opportunity */}
        <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-8">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to 3x Your Revenue?
            </h3>
            <p className="text-gray-700 mb-6">
              Businesses using all Indigenious features see an average revenue increase of 300% in their 
              first year. You're already seeing great results - imagine what's possible when you unlock 
              everything.
            </p>
            <div className="flex items-center gap-6">
              <BrandCTA href="/business/growth-plan" variant="primary" size="lg">
                See Your Growth Plan
              </BrandCTA>
              <Link href="/business/success-stories" className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1">
                Read Success Stories <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}