'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { financialFlowTracker } from '@/lib/finance/financial-flow-tracker';
import { impactMeasurementEngine } from '@/lib/impact/impact-measurement-engine';
import { TrendingUp, Users, Building2, DollarSign, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy visualization components
const CanadaHeatMap = dynamic(() => import('./visualizations/CanadaHeatMap'), { ssr: false });
const ImpactCounter = dynamic(() => import('./visualizations/ImpactCounter'), { ssr: false });

interface DashboardMetrics {
  reconciliation: {
    score: number;
    trend: number;
    target: number;
    projection: string;
  };
  economicGap: {
    current: number;
    closingRate: number;
    zeroGapYear: number;
  };
  jobs: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  business: {
    new: number;
    total: number;
    growthRate: number;
    survivalRate: number;
  };
  investment: {
    deployed: number;
    multiplier: number;
    activity: number;
  };
}

export function PrimeMinisterDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'prosperity' | 'jobs' | 'investment' | 'business'>('prosperity');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDashboardData();
    
    // Real-time updates
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshKey > 0) {
      loadDashboardData();
    }
  }, [refreshKey]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get government metrics
      const govMetrics = await financialFlowTracker.getGovernmentMetrics('month');
      const impactMetrics = await impactMeasurementEngine.getDashboardMetrics('national');

      // Calculate reconciliation score (simplified)
      const reconciliationScore = Math.round(
        (govMetrics.indigenousReached / govMetrics.totalDeployed) * 100
      );

      setMetrics({
        reconciliation: {
          score: reconciliationScore,
          trend: 2.3,
          target: 85,
          projection: 'On track for 2027',
        },
        economicGap: {
          current: 4500,
          closingRate: 8,
          zeroGapYear: 2034,
        },
        jobs: {
          today: impactMetrics.realTime.jobsToday,
          week: 234, // Would calculate from trends
          month: 2341,
          total: impactMetrics.totals.totalJobs,
        },
        business: {
          new: impactMetrics.realTime.businessesToday,
          total: impactMetrics.totals.totalBusinesses,
          growthRate: 23,
          survivalRate: 89,
        },
        investment: {
          deployed: govMetrics.totalDeployed,
          multiplier: impactMetrics.totals.economicMultiplier,
          activity: govMetrics.totalDeployed * impactMetrics.totals.economicMultiplier,
        },
      });
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-2xl">Loading National Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-white mb-2">
          Indigenous Economic Prosperity Dashboard
        </h1>
        <p className="text-white/70 text-lg">
          Real-time national impact metrics • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Reconciliation Score */}
        <div onClick={() => setSelectedView('prosperity')}>
          <GlassPanel className="p-6 cursor-pointer hover:bg-white/15 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <span className="text-green-400 text-sm font-semibold">
                +{metrics.reconciliation.trend}%
              </span>
            </div>
            <h3 className="text-white/80 text-sm font-medium mb-2">
              Reconciliation Progress
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {metrics.reconciliation.score}%
              </span>
              <span className="text-white/60 text-sm">
                / {metrics.reconciliation.target}% target
              </span>
            </div>
            <div className="mt-2 text-xs text-white/60">
              {metrics.reconciliation.projection}
            </div>
          </GlassPanel>
        </div>

        {/* Jobs Created */}
        <div onClick={() => setSelectedView('jobs')}>
          <GlassPanel className="p-6 cursor-pointer hover:bg-white/15 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-400" />
            <ImpactCounter 
              value={metrics.jobs.today} 
              prefix="+" 
              suffix=" today"
              className="text-blue-400 text-sm font-semibold"
            />
          </div>
          <h3 className="text-white/80 text-sm font-medium mb-2">
            Jobs Created
          </h3>
          <div className="flex items-baseline gap-2">
            <ImpactCounter 
              value={metrics.jobs.total} 
              className="text-3xl font-bold text-white"
              format="compact"
            />
            <span className="text-white/60 text-sm">
              total
            </span>
          </div>
          <div className="mt-2 text-xs text-white/60">
            {metrics.jobs.month.toLocaleString()} this month
          </div>
          </GlassPanel>
        </div>

        {/* Business Growth */}
        <div onClick={() => setSelectedView('business')}>
          <GlassPanel className="p-6 cursor-pointer hover:bg-white/15 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-8 h-8 text-purple-400" />
            <span className="text-purple-400 text-sm font-semibold">
              +{metrics.business.growthRate}%
            </span>
          </div>
          <h3 className="text-white/80 text-sm font-medium mb-2">
            Indigenous Businesses
          </h3>
          <div className="flex items-baseline gap-2">
            <ImpactCounter 
              value={metrics.business.total} 
              className="text-3xl font-bold text-white"
              format="compact"
            />
            <span className="text-white/60 text-sm">
              active
            </span>
          </div>
          <div className="mt-2 text-xs text-white/60">
            {metrics.business.survivalRate}% survival rate
          </div>
          </GlassPanel>
        </div>

        {/* Economic Activity */}
        <div onClick={() => setSelectedView('investment')}>
          <GlassPanel className="p-6 cursor-pointer hover:bg-white/15 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-semibold">
              {metrics.investment.multiplier}x
            </span>
          </div>
          <h3 className="text-white/80 text-sm font-medium mb-2">
            Economic Activity
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              ${(metrics.investment.activity / 1e9).toFixed(1)}B
            </span>
            <span className="text-white/60 text-sm">
              generated
            </span>
          </div>
          <div className="mt-2 text-xs text-white/60">
            From ${(metrics.investment.deployed / 1e9).toFixed(1)}B deployed
          </div>
          </GlassPanel>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Canada Heat Map */}
        <div className="lg:col-span-2">
          <GlassPanel className="p-6 h-[600px]">
            <h2 className="text-xl font-semibold text-white mb-4">
              Indigenous Prosperity by Region
            </h2>
            <CanadaHeatMap 
              view={selectedView}
              data={{
                // This would come from real data
                regions: [
                  { id: 'BC', name: 'British Columbia', prosperity: 78, jobs: 12453, businesses: 567, investment: 234000000, indigenousPopulation: 270585 },
                  { id: 'AB', name: 'Alberta', prosperity: 82, jobs: 8934, businesses: 423, investment: 189000000, indigenousPopulation: 220695 },
                  { id: 'SK', name: 'Saskatchewan', prosperity: 71, jobs: 5678, businesses: 234, investment: 145000000, indigenousPopulation: 175015 },
                  // ... more regions
                ],
              }}
            />
          </GlassPanel>
        </div>

        {/* Daily Success Story */}
        <div>
          <GlassPanel className="p-6 h-[290px] mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Today's Impact Story
            </h3>
            <div className="space-y-3">
              <img 
                src="/images/success-story.jpg" 
                alt="Success story"
                className="w-full h-32 object-cover rounded-lg"
              />
              <h4 className="text-white font-medium">
                Cree Construction Wins $45M Contract
              </h4>
              <p className="text-white/70 text-sm">
                Creating 125 jobs in Northern Ontario, with 85% Indigenous hiring
              </p>
              <button className="text-blue-400 text-sm hover:text-blue-300">
                Share Story →
              </button>
            </div>
          </GlassPanel>

          {/* Alerts */}
          <GlassPanel className="p-6 h-[290px]">
            <h3 className="text-lg font-semibold text-white mb-3">
              Action Required
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">
                    Transport Canada Below Target
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    Only 1.2% Indigenous procurement
                  </p>
                  <button className="text-red-400 text-xs mt-2 hover:text-red-300">
                    Schedule Meeting →
                  </button>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <GlassPanel className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-white/60 text-sm">Economic Gap:</span>
              <span className="text-white font-semibold ml-2">
                ${metrics.economicGap.current.toLocaleString()}
              </span>
              <span className="text-green-400 text-sm ml-2">
                ↓{metrics.economicGap.closingRate}% yearly
              </span>
            </div>
            <div>
              <span className="text-white/60 text-sm">Gap Closes:</span>
              <span className="text-white font-semibold ml-2">
                {metrics.economicGap.zeroGapYear}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
              Export Report
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Full Analytics
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}