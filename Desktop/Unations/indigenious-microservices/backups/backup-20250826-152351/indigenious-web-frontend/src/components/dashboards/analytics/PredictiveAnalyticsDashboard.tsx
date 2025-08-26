'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import ImpactCounter from '@/components/dashboards/government/visualizations/ImpactCounter';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Target,
  DollarSign,
  Users,
  Building2,
  Globe,
  Calendar,
  ChevronRight,
  BarChart3,
  LineChart,
  Activity
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface Prediction {
  modelId: string;
  type: string;
  targetDate: string;
  predictedValue: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
}

interface EconomicForecast {
  period: string;
  procurement: {
    totalValue: number;
    indigenousShare: number;
    growthRate: number;
    targetAchievement: number;
  };
  impact: {
    jobsCreated: number;
    businessesStarted: number;
    communityInvestment: number;
    prosperityScore: number;
  };
  risks: Array<{
    type: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;
  opportunities: Array<{
    type: string;
    potential: number;
    requirements: string[];
    timeline: string;
  }>;
}

interface Anomaly {
  type: string;
  severity: string;
  metric: string;
  detectedValue: number;
  expectedValue: number;
  deviation: number;
  timestamp: string;
  explanation: string;
}

// Sample data for visualization
const SAMPLE_PREDICTIONS: Prediction[] = [
  {
    modelId: 'procurement_growth',
    type: 'procurement',
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    predictedValue: 3500000000,
    confidence: 0.85,
    lowerBound: 2975000000,
    upperBound: 4025000000,
    factors: [
      { name: 'Government Policy', impact: 0.35, description: '5% procurement target driving growth' },
      { name: 'Business Capacity', impact: 0.25, description: 'Growing number of qualified Indigenous businesses' },
      { name: 'Economic Conditions', impact: 0.20, description: 'Overall economic growth supporting procurement' },
      { name: 'Platform Adoption', impact: 0.20, description: 'Increased platform usage improving match rates' },
    ],
  },
  {
    modelId: 'job_creation',
    type: 'jobs',
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    predictedValue: 12500,
    confidence: 0.82,
    lowerBound: 10000,
    upperBound: 15000,
    factors: [
      { name: 'Contract Pipeline', impact: 0.40, description: '$280M in recent contracts' },
      { name: 'Industry Mix', impact: 0.30, description: 'Construction and services driving job creation' },
      { name: 'Training Programs', impact: 0.20, description: 'Skills development increasing workforce capacity' },
      { name: 'Seasonal Patterns', impact: 0.10, description: 'High season for employment' },
    ],
  },
];

const SAMPLE_FORECAST: EconomicForecast = {
  period: '1_year',
  procurement: {
    totalValue: 3500000000,
    indigenousShare: 3.5,
    growthRate: 25,
    targetAchievement: 70,
  },
  impact: {
    jobsCreated: 50000,
    businessesStarted: 500,
    communityInvestment: 1200000000,
    prosperityScore: 75,
  },
  risks: [
    {
      type: 'Capacity Constraints',
      probability: 0.6,
      impact: 0.7,
      mitigation: 'Accelerate business development and training programs',
    },
    {
      type: 'Economic Downturn',
      probability: 0.3,
      impact: 0.8,
      mitigation: 'Diversify sectors and maintain government commitment',
    },
  ],
  opportunities: [
    {
      type: 'Green Economy Transition',
      potential: 500000000,
      requirements: ['Clean tech skills', 'Environmental certifications', 'Capital access'],
      timeline: '2-3 years',
    },
    {
      type: 'Digital Services Expansion',
      potential: 200000000,
      requirements: ['Tech talent', 'High-speed internet', 'Cloud infrastructure'],
      timeline: '1-2 years',
    },
  ],
};

// Generate sample time series data
const generateTimeSeriesData = () => {
  const data = [];
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    
    data.push({
      date: date.toISOString().slice(0, 7),
      actual: 200000000 + Math.random() * 50000000 + i * 15000000,
      predicted: 220000000 + i * 20000000,
      lowerBound: 200000000 + i * 18000000,
      upperBound: 240000000 + i * 22000000,
    });
  }
  
  return data;
};

export default function PredictiveAnalyticsDashboard() {
  const [predictions, setPredictions] = useState<Prediction[]>(SAMPLE_PREDICTIONS);
  const [forecast, setForecast] = useState<EconomicForecast>(SAMPLE_FORECAST);
  const [timeSeriesData] = useState(generateTimeSeriesData());
  const [selectedModel, setSelectedModel] = useState<string>('procurement_growth');
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    // In production, fetch real predictions from API
    const fetchPredictions = async () => {
      try {
        const response = await fetch('/api/analytics/predictions');
        if (response.ok) {
          const data = await response.json();
          setPredictions(data.predictions || SAMPLE_PREDICTIONS);
          setForecast(data.forecast || SAMPLE_FORECAST);
          setAnomalies(data.anomalies || []);
        }
      } catch (error) {
        logger.error('Error fetching predictions:', error);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const selectedPrediction = predictions.find(p => p.modelId === selectedModel) || predictions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="h-8 w-8 text-purple-400" />
            Predictive Analytics & ML Forecasting
          </h1>
          <p className="text-white/70 mt-2">
            AI-powered predictions for Indigenous economic growth and procurement trends
          </p>
        </div>
        <GlassPanel className="px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/70 text-sm">Models Updated: Just Now</span>
          </div>
        </GlassPanel>
      </div>

      {/* Key Predictions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8 text-green-400" />
              <span className="text-xs text-white/60">1 Year</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              <ImpactCounter
                value={forecast.procurement.totalValue}
                format="currency"
                duration={2}
              />
            </div>
            <div className="text-white/70 text-sm">Predicted Procurement</div>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-green-400 text-sm">+{forecast.procurement.growthRate}%</span>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-400" />
              <span className="text-xs text-white/60">1 Year</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              <ImpactCounter
                value={forecast.impact.jobsCreated}
                format="compact"
                duration={2}
              />
            </div>
            <div className="text-white/70 text-sm">Jobs to be Created</div>
            <div className="text-blue-400 text-xs mt-2">
              {Math.round(forecast.impact.jobsCreated / 365)} jobs/day average
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Building2 className="h-8 w-8 text-purple-400" />
              <span className="text-xs text-white/60">1 Year</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              <ImpactCounter
                value={forecast.impact.businessesStarted}
                format="number"
                duration={2}
              />
            </div>
            <div className="text-white/70 text-sm">New Businesses</div>
            <div className="text-purple-400 text-xs mt-2">
              ~{Math.round(forecast.impact.businessesStarted / 52)} per week
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="h-8 w-8 text-orange-400" />
              <span className="text-xs text-white/60">Progress</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {forecast.procurement.targetAchievement}%
            </div>
            <div className="text-white/70 text-sm">of 5% Target</div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
              <motion.div
                className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${forecast.procurement.targetAchievement}%` }}
                transition={{ duration: 2, delay: 0.5 }}
              />
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Prediction Models */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Selection and Details */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1"
        >
          <GlassPanel className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Prediction Models
            </h3>
            
            <div className="space-y-3">
              {predictions.map((pred) => (
                <button
                  key={pred.modelId}
                  onClick={() => setSelectedModel(pred.modelId)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedModel === pred.modelId
                      ? 'bg-white/20 border border-purple-400/50'
                      : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium capitalize">
                      {pred.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-white/60">
                      {(pred.confidence * 100).toFixed(0)}% conf
                    </span>
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    {new Date(pred.targetDate).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            {selectedPrediction && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <h4 className="text-white font-semibold mb-3">Prediction Factors</h4>
                <div className="space-y-2">
                  {selectedPrediction.factors.map((factor, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/80">{factor.name}</span>
                        <span className="text-white/60">{(factor.impact * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${factor.impact * 100}%` }}
                          transition={{ duration: 1, delay: 0.1 * index }}
                        />
                      </div>
                      <p className="text-xs text-white/60 mt-1">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassPanel>
        </motion.div>

        {/* Time Series Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          <GlassPanel className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-400" />
              Procurement Growth Forecast
            </h3>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'white' }}
                    formatter={(value: number) => `$${(value / 1000000).toFixed(1)}M`}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'white' }}
                    iconType="line"
                  />
                  
                  {/* Confidence interval */}
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="none"
                    fill="rgba(59, 130, 246, 0.1)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="none"
                    fill="white"
                    stackId="1"
                  />
                  
                  {/* Actual vs Predicted */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Actual"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Predicted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Opportunities and Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opportunities */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassPanel className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Growth Opportunities
            </h3>
            
            <div className="space-y-4">
              {forecast.opportunities.map((opp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="border border-white/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-semibold">{opp.type}</h4>
                    <span className="text-green-400 font-medium text-sm">
                      ${(opp.potential / 1000000).toFixed(0)}M
                    </span>
                  </div>
                  <div className="text-white/70 text-sm mb-2">
                    Timeline: {opp.timeline}
                  </div>
                  <div className="space-y-1">
                    {opp.requirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <ChevronRight className="h-3 w-3" />
                        {req}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Risk Matrix */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassPanel className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Risk Assessment
            </h3>
            
            <div className="space-y-4">
              {forecast.risks.map((risk, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="border border-white/20 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold">{risk.type}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        risk.probability * risk.impact > 0.5
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {risk.probability * risk.impact > 0.5 ? 'High Risk' : 'Medium Risk'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-white/60 mb-1">Probability</div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-orange-400 h-2 rounded-full"
                          style={{ width: `${risk.probability * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-white/60 mb-1">Impact</div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-red-400 h-2 rounded-full"
                          style={{ width: `${risk.impact * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-white/70">
                    <span className="text-white/60">Mitigation:</span> {risk.mitigation}
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Anomaly Detection */}
      {anomalies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <GlassPanel className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Anomaly Detection
            </h3>
            
            <div className="space-y-3">
              {anomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    anomaly.severity === 'high'
                      ? 'border-red-400/50 bg-red-500/10'
                      : 'border-yellow-400/50 bg-yellow-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {anomaly.type === 'spike' ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-white font-medium capitalize">
                        {anomaly.metric.replace('_', ' ')} {anomaly.type}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      anomaly.severity === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {anomaly.severity} severity
                    </span>
                  </div>
                  <div className="text-sm text-white/70">
                    {anomaly.explanation}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-white/60">
                    <span>Expected: {anomaly.expectedValue}</span>
                    <span>Detected: {anomaly.detectedValue}</span>
                    <span>Deviation: {anomaly.deviation.toFixed(1)}σ</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}