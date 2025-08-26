'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import ImpactCounter from '@/components/dashboards/government/visualizations/ImpactCounter';
import CanadaHeatMap from '@/components/dashboards/government/visualizations/CanadaHeatMap';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  DollarSign, 
  Target, 
  MapPin, 
  Calendar,
  ExternalLink,
  Award,
  Globe
} from 'lucide-react';

interface TransparencyData {
  national: {
    totalInvestment: number;
    jobsCreated: number;
    businessesSupported: number;
    governmentTarget: number;
    currentProgress: number;
    lastUpdated: string;
  };
  regional: {
    regions: Array<{
      id: string;
      name: string;
      prosperity: number;
      jobs: number;
      businesses: number;
      investment: number;
      indigenousPopulation: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'contract_award' | 'milestone' | 'business_launch';
    title: string;
    description: string;
    amount?: number;
    location: string;
    date: string;
  }>;
  successStories: Array<{
    id: string;
    title: string;
    community: string;
    impact: string;
    imageUrl?: string;
    metrics: {
      jobs?: number;
      investment?: number;
      businesses?: number;
    };
  }>;
}

// Sample data for the portal
const SAMPLE_DATA: TransparencyData = {
  national: {
    totalInvestment: 2340000000, // $2.34B
    jobsCreated: 45670,
    businessesSupported: 3847,
    governmentTarget: 5.0, // 5% target
    currentProgress: 3.2, // 3.2% current
    lastUpdated: '2025-01-07T10:30:00Z',
  },
  regional: {
    regions: [
      { id: 'BC', name: 'British Columbia', prosperity: 78, jobs: 12453, businesses: 567, investment: 234000000, indigenousPopulation: 270585 },
      { id: 'AB', name: 'Alberta', prosperity: 82, jobs: 8934, businesses: 423, investment: 189000000, indigenousPopulation: 220695 },
      { id: 'SK', name: 'Saskatchewan', prosperity: 71, jobs: 5678, businesses: 234, investment: 145000000, indigenousPopulation: 175015 },
      { id: 'MB', name: 'Manitoba', prosperity: 75, jobs: 4567, businesses: 198, investment: 98000000, indigenousPopulation: 223310 },
      { id: 'ON', name: 'Ontario', prosperity: 73, jobs: 15678, businesses: 789, investment: 456000000, indigenousPopulation: 374395 },
      { id: 'QC', name: 'Quebec', prosperity: 69, jobs: 8923, businesses: 445, investment: 234000000, indigenousPopulation: 182890 },
      { id: 'NB', name: 'New Brunswick', prosperity: 65, jobs: 2345, businesses: 123, investment: 67000000, indigenousPopulation: 25235 },
      { id: 'NS', name: 'Nova Scotia', prosperity: 68, jobs: 3456, businesses: 167, investment: 89000000, indigenousPopulation: 51485 },
      { id: 'PE', name: 'Prince Edward Island', prosperity: 72, jobs: 456, businesses: 23, investment: 12000000, indigenousPopulation: 2230 },
      { id: 'NL', name: 'Newfoundland and Labrador', prosperity: 63, jobs: 1234, businesses: 67, investment: 45000000, indigenousPopulation: 45725 },
      { id: 'YT', name: 'Yukon', prosperity: 89, jobs: 567, businesses: 45, investment: 23000000, indigenousPopulation: 8195 },
      { id: 'NT', name: 'Northwest Territories', prosperity: 85, jobs: 789, businesses: 67, investment: 34000000, indigenousPopulation: 20860 },
      { id: 'NU', name: 'Nunavut', prosperity: 91, jobs: 345, businesses: 34, investment: 18000000, indigenousPopulation: 30550 },
    ],
  },
  recentActivity: [
    {
      id: '1',
      type: 'contract_award',
      title: 'Northern Infrastructure Project Awarded',
      description: 'Major infrastructure contract awarded to Mikisew Cree First Nation Construction',
      amount: 45000000,
      location: 'Fort McMurray, AB',
      date: '2025-01-06',
    },
    {
      id: '2',
      type: 'business_launch',
      title: 'New Indigenous Tech Company Launches',
      description: 'Anishinaabe Digital Solutions opens new software development center',
      amount: 2000000,
      location: 'Toronto, ON',
      date: '2025-01-05',
    },
    {
      id: '3',
      type: 'milestone',
      title: '10,000th Job Created',
      description: 'Platform reaches milestone of 10,000 jobs created for Indigenous workers',
      location: 'National',
      date: '2025-01-04',
    },
  ],
  successStories: [
    {
      id: '1',
      title: 'Revitalizing Traditional Knowledge Through Modern Infrastructure',
      community: 'Tahltan Nation, BC',
      impact: 'Combined traditional ecological knowledge with modern engineering to restore 50km of salmon habitat while creating 150 permanent jobs.',
      metrics: { jobs: 150, investment: 12000000, businesses: 3 },
    },
    {
      id: '2', 
      title: 'Arctic Innovation Hub Transforms Remote Community',
      community: 'Iqaluit, NU',
      impact: 'Technology center brings high-speed internet and digital skills training to 15 remote communities, enabling new economic opportunities.',
      metrics: { jobs: 89, investment: 8500000, businesses: 12 },
    },
    {
      id: '3',
      title: 'Sustainable Energy Project Powers Community Growth',
      community: 'Membertou First Nation, NS',
      impact: 'Solar and wind energy installation reduces community energy costs by 60% while training 200 Indigenous technicians.',
      metrics: { jobs: 200, investment: 15000000, businesses: 5 },
    },
  ],
};

export default function TransparencyPortal() {
  const [data, setData] = useState<TransparencyData>(SAMPLE_DATA);
  const [selectedView, setSelectedView] = useState<'prosperity' | 'jobs' | 'investment' | 'business'>('prosperity');
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransparencyData = async () => {
    try {
      const response = await fetch('/api/transparency', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transparency data');
      }
      
      const newData = await response.json();
      setData(newData);
      setIsLive(true);
    } catch (error) {
      logger.error('Error fetching transparency data:', error);
      setIsLive(false);
      // Fall back to sample data if API fails
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial data load
    fetchTransparencyData();
    
    // Update data every 30 seconds
    const interval = setInterval(fetchTransparencyData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <GlassPanel className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading transparency data...</div>
          <div className="text-white/70 text-sm mt-2">Connecting to real-time government systems</div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <Globe className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">
                Indigenous Procurement Transparency Portal
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-white/80 max-w-3xl mx-auto"
            >
              Real-time visibility into government procurement supporting Indigenous businesses across Canada.
              Track progress toward the 5% Indigenous procurement target and see the economic impact in your community.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 mt-4"
            >
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-white/70 text-sm">
                Last updated: {new Date(data.national.lastUpdated).toLocaleString()}
              </span>
            </motion.div>
          </div>

          {/* National Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <GlassPanel className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                <ImpactCounter
                  value={data.national.totalInvestment}
                  format="currency"
                  duration={2.5}
                />
              </div>
              <div className="text-white/70 text-sm">Total Investment</div>
            </GlassPanel>

            <GlassPanel className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                <ImpactCounter
                  value={data.national.jobsCreated}
                  format="compact"
                  duration={2.5}
                />
              </div>
              <div className="text-white/70 text-sm">Jobs Created</div>
            </GlassPanel>

            <GlassPanel className="p-6 text-center">
              <Building2 className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                <ImpactCounter
                  value={data.national.businessesSupported}
                  format="compact"
                  duration={2.5}
                />
              </div>
              <div className="text-white/70 text-sm">Businesses Supported</div>
            </GlassPanel>

            <GlassPanel className="p-6 text-center">
              <Target className="h-8 w-8 text-orange-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                <ImpactCounter
                  value={data.national.currentProgress}
                  format="number"
                  suffix="%"
                  duration={2.5}
                />
              </div>
              <div className="text-white/70 text-sm">
                of {data.national.governmentTarget}% Target
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                <motion.div
                  className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.national.currentProgress / data.national.governmentTarget) * 100}%` }}
                  transition={{ duration: 2, delay: 1 }}
                />
              </div>
            </GlassPanel>
          </motion.div>

          {/* Interactive Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-blue-400" />
                  Regional Impact Overview
                </h2>
                <div className="flex gap-2">
                  {(['prosperity', 'jobs', 'investment', 'business'] as const).map((view) => (
                    <GlassButton
                      key={view}
                      variant={selectedView === view ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setSelectedView(view)}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </GlassButton>
                  ))}
                </div>
              </div>
              <div className="h-96">
                <CanadaHeatMap
                  view={selectedView}
                  data={data.regional}
                />
              </div>
            </GlassPanel>
          </motion.div>

          {/* Recent Activity & Success Stories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GlassPanel className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {data.recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="border-l-2 border-blue-400/50 pl-4 py-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">
                            {activity.title}
                          </h4>
                          <p className="text-white/70 text-sm mb-2">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-white/60">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {activity.location}
                            </span>
                            <span>{new Date(activity.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {activity.amount && (
                          <div className="text-green-400 font-medium text-sm">
                            ${(activity.amount / 1000000).toFixed(1)}M
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>

            {/* Success Stories */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GlassPanel className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-400" />
                  Success Stories
                </h3>
                <div className="space-y-6">
                  {data.successStories.map((story, index) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="border border-white/20 rounded-lg p-4"
                    >
                      <h4 className="text-white font-semibold mb-2">
                        {story.title}
                      </h4>
                      <p className="text-blue-400 text-sm mb-2">
                        {story.community}
                      </p>
                      <p className="text-white/70 text-sm mb-3">
                        {story.impact}
                      </p>
                      <div className="flex gap-4 text-xs">
                        {story.metrics.jobs && (
                          <span className="text-blue-400">
                            {story.metrics.jobs} jobs
                          </span>
                        )}
                        {story.metrics.investment && (
                          <span className="text-green-400">
                            ${(story.metrics.investment / 1000000).toFixed(1)}M invested
                          </span>
                        )}
                        {story.metrics.businesses && (
                          <span className="text-purple-400">
                            {story.metrics.businesses} businesses
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 text-center"
          >
            <GlassPanel className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-white/70 text-sm">
                  Powered by the Indigenous Procurement Platform • 
                  Data updated in real-time from government sources
                </div>
                <div className="flex gap-4">
                  <GlassButton 
                    variant="secondary" 
                    size="sm"
                    onClick={() => window.open('/api-docs', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    API Access
                  </GlassButton>
                  <GlassButton 
                    variant="secondary" 
                    size="sm"
                    onClick={() => window.open('/data-sources', '_blank')}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Data Sources
                  </GlassButton>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </div>
    </div>
  );
}