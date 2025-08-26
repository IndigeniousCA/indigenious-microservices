import { redirect } from 'next/navigation';
import { detectUserType } from '@/app/actions/detect-user-type';

// Force dynamic rendering due to cookies usage
export const dynamic = 'force-dynamic';
import { UserType } from '@/lib/brand/brand-config';
import { ContentAdaptationEngine } from '@/lib/brand/content-strategy';
import {
  IndigiousLogo,
  BrandCTA,
} from '@/lib/brand/brand-components';
import { 
  Briefcase,
  Users,
  TrendingUp,
  DollarSign,
  FileText,
  Award,
  Clock,
  Building,
  Shield,
  BarChart3,
  Sparkles,
  ChevronRight,
  Bell,
  Search
} from 'lucide-react';
import Link from 'next/link';

// Professional-specific components
import ClientPortfolio from './client-portfolio';
import ServiceMarketplace from './service-marketplace';
import ComplianceTools from './compliance-tools';
import RevenueTracker from './revenue-tracker';

export default async function ProfessionalDashboard() {
  // Verify user is a professional service provider
  const { userType } = await detectUserType();
  
  // Get dashboard content - using LAW_FIRM as default professional type
  const dashboardContent = ContentAdaptationEngine.getDashboardContent(UserType.LAW_FIRM);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <IndigiousLogo size="sm" />
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/professional" className="text-gray-900 font-semibold">Dashboard</Link>
                <Link href="/professional/clients" className="text-gray-600 hover:text-gray-900">Clients</Link>
                <Link href="/professional/opportunities" className="text-gray-600 hover:text-gray-900">Opportunities</Link>
                <Link href="/professional/tools" className="text-gray-600 hover:text-gray-900">Tools</Link>
                <Link href="/professional/billing" className="text-gray-600 hover:text-gray-900">Billing</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <Search className="w-5 h-5" />
              </button>
              <button className="relative text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                KL
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
        
        {/* Growth Alert */}
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <p className="font-semibold text-indigo-900">Indigenous procurement is growing 45% year-over-year!</p>
            <p className="text-sm text-indigo-800 mt-1">
              Your expertise is in high demand. 87% of Indigenous businesses need help navigating government contracts.
            </p>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Clients</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">24</div>
            <p className="text-xs text-green-600 mt-1">+3 this month</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Monthly Revenue</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">$47,500</div>
            <p className="text-xs text-green-600 mt-1">+22% vs last month</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Success Rate</span>
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">92%</div>
            <p className="text-xs text-gray-600 mt-1">Bids won</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Response Time</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">2.3h</div>
            <p className="text-xs text-blue-600 mt-1">Industry best</p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/professional/new-client"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-500 transition-colors flex items-center gap-3 group"
          >
            <span className="text-2xl">🤝</span>
            <span className="font-medium text-gray-900 group-hover:text-indigo-600">Add Client</span>
          </Link>
          <Link
            href="/professional/proposals"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-500 transition-colors flex items-center gap-3 group"
          >
            <span className="text-2xl">📝</span>
            <span className="font-medium text-gray-900 group-hover:text-indigo-600">Create Proposal</span>
          </Link>
          <Link
            href="/professional/invoices"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-500 transition-colors flex items-center gap-3 group"
          >
            <span className="text-2xl">💰</span>
            <span className="font-medium text-gray-900 group-hover:text-indigo-600">Send Invoice</span>
          </Link>
          <Link
            href="/professional/compliance"
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-500 transition-colors flex items-center gap-3 group"
          >
            <span className="text-2xl">✅</span>
            <span className="font-medium text-gray-900 group-hover:text-indigo-600">Compliance Check</span>
          </Link>
        </div>
        
        {/* Main Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Client Portfolio */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Briefcase className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Client Portfolio</h2>
              </div>
              <BrandCTA href="/professional/clients" size="sm" variant="ghost">
                View All
              </BrandCTA>
            </div>
            <ClientPortfolio />
          </div>
          
          {/* Service Marketplace */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Service Requests</h2>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                5 NEW
              </span>
            </div>
            <ServiceMarketplace />
          </div>
          
          {/* Compliance Tools */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Shield className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Compliance Center</h2>
              </div>
              <BrandCTA href="/professional/tools" size="sm" variant="ghost">
                All Tools
              </BrandCTA>
            </div>
            <ComplianceTools />
          </div>
          
          {/* Revenue Tracker */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Revenue Analytics</h2>
              </div>
              <BrandCTA href="/professional/analytics" size="sm" variant="ghost">
                Details
              </BrandCTA>
            </div>
            <RevenueTracker />
          </div>
        </div>
        
        {/* Learning Resources */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Professional Development</h3>
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Indigenous Procurement 101</h4>
              <p className="text-sm text-gray-600 mb-3">
                Master the fundamentals of helping Indigenous businesses win government contracts.
              </p>
              <Link href="/professional/courses/procurement-101" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                Start Course <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Advanced Bid Writing</h4>
              <p className="text-sm text-gray-600 mb-3">
                Learn techniques that increase win rates by 40% for Indigenous businesses.
              </p>
              <Link href="/professional/courses/bid-writing" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                Continue <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Compliance Certification</h4>
              <p className="text-sm text-gray-600 mb-3">
                Get certified in Indigenous business compliance and regulations.
              </p>
              <Link href="/professional/courses/compliance" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                Get Certified <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Become a Preferred Partner
            </h3>
            <p className="text-gray-700 mb-6">
              Join our exclusive network of certified professionals. Get priority listing, 
              direct client referrals, and access to premium tools. Limited spots available.
            </p>
            <div className="flex items-center gap-6">
              <BrandCTA href="/professional/partner-program" variant="primary" size="lg">
                Apply for Partnership
              </BrandCTA>
              <Link href="/professional/success-stories" className="text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1">
                Partner Success Stories <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}