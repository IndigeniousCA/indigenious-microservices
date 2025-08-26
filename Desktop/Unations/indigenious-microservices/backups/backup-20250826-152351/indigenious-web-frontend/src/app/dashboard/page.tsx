'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import Link from 'next/link';
import { 
  Building2, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign,
  Bell,
  Plus,
  ArrowRight,
  Calendar,
  Target,
  Award,
  Briefcase
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const stats = [
    { label: 'Active RFQs', value: '12', icon: FileText, change: '+3 this week' },
    { label: 'Total Bids', value: '48', icon: Briefcase, change: '+12% from last month' },
    { label: 'Success Rate', value: '31%', icon: Target, change: '+5% improvement' },
    { label: 'Revenue', value: '$2.4M', icon: DollarSign, change: '+18% YTD' },
  ];

  const recentRFQs = [
    { id: 1, title: 'Construction Services - Thunder Bay', value: '$450K', deadline: '2025-02-15', status: 'open' },
    { id: 2, title: 'IT Consulting - Federal Government', value: '$180K', deadline: '2025-02-10', status: 'open' },
    { id: 3, title: 'Catering Services - Treaty 6', value: '$35K', deadline: '2025-02-05', status: 'closing' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Header */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-white/80 hover:text-white">Overview</Link>
                <Link href="/rfq" className="text-white/80 hover:text-white">RFQs</Link>
                <Link href="/bids" className="text-white/80 hover:text-white">My Bids</Link>
                <Link href="/analytics" className="text-white/80 hover:text-white">Analytics</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative">
                <Bell className="h-6 w-6 text-white/80 hover:text-white" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
              </button>
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {session?.user?.name || session?.user?.email || 'User'}!
          </h2>
          <p className="text-white/70">Here's what's happening with your procurement activities</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <Link href="/rfq/browse">
            <GlassPanel className="p-6 hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Browse RFQs</h3>
                  <p className="text-white/70 text-sm">Find new opportunities</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </GlassPanel>
          </Link>

          <Link href="/bids/create">
            <GlassPanel className="p-6 hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Submit Bid</h3>
                  <p className="text-white/70 text-sm">Respond to RFQs</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
              </div>
            </GlassPanel>
          </Link>

          <Link href="/profile">
            <GlassPanel className="p-6 hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Update Profile</h3>
                  <p className="text-white/70 text-sm">Keep info current</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </GlassPanel>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <GlassPanel key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="h-8 w-8 text-purple-400" />
                <span className="text-xs text-green-400">{stat.change}</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/70">{stat.label}</div>
            </GlassPanel>
          ))}
        </motion.div>

        {/* Recent RFQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Opportunities</h3>
              <Link href="/rfq">
                <GlassButton variant="secondary" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </GlassButton>
              </Link>
            </div>

            <div className="space-y-4">
              {recentRFQs.map((rfq) => (
                <div key={rfq.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">{rfq.title}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {rfq.value}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {rfq.deadline}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        rfq.status === 'open' 
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {rfq.status === 'open' ? 'Open' : 'Closing Soon'}
                      </span>
                      <Link href={`/rfq/${rfq.id}`}>
                        <GlassButton size="sm">View Details</GlassButton>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}