import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Search, CheckCircle, AlertTriangle, Building2, 
  FileText, Users, Calendar, TrendingUp, Eye, RefreshCw,
  ChevronRight, BarChart3, Bell, MapPin, Clock, Award,
  Leaf, Database, Wifi, WifiOff, Lock, Key, X, Globe,
  DollarSign, Zap, Heart, Activity, ArrowUp, ArrowDown
} from 'lucide-react';
import { ComplianceReporting } from '../src/components/analytics/ComplianceReporting';
import { ContractTemplates } from '../src/components/procurement/ContractTemplates';

// Mock data for government systems integration
const mockGovernmentSystems = {
  CRA: { status: 'connected', lastSync: '2025-06-11 14:30', reliability: 99.8 },
  ISED: { status: 'connected', lastSync: '2025-06-11 14:28', reliability: 99.5 },
  ISC: { status: 'connected', lastSync: '2025-06-11 14:25', reliability: 98.9 },
  PSPC: { status: 'syncing', lastSync: '2025-06-11 14:15', reliability: 97.2 },
  CCAB: { status: 'connected', lastSync: '2025-06-11 14:32', reliability: 99.9 }
};

// Mock Indigenous businesses for verification
const mockBusinesses = [
  {
    id: 1,
    name: 'Northern Star Construction Ltd.',
    location: 'Thunder Bay, ON',
    indigenousOwnership: 75,
    verificationStatus: 'verified',
    riskScore: 15,
    lastVerified: '2025-06-10',
    capabilities: ['Construction', 'Project Management', 'Environmental Consulting'],
    communityValidation: 'approved',
    revenuePerEmployee: 125000,
    contracts: 12,
    carbonFootprint: '-20% vs industry avg',
    localEmployees: 45,
    trustScore: 94
  },
  {
    id: 2,
    name: 'Eagle Eye Security Services',
    location: 'Winnipeg, MB',
    indigenousOwnership: 51,
    verificationStatus: 'pending',
    riskScore: 45,
    lastVerified: null,
    capabilities: ['Security Services', 'Facility Management'],
    communityValidation: 'pending',
    revenuePerEmployee: 450000,
    contracts: 3,
    carbonFootprint: 'Not assessed',
    localEmployees: 8,
    trustScore: 62
  },
  {
    id: 3,
    name: 'Raven Tech Solutions Inc.',
    location: 'Vancouver, BC',
    indigenousOwnership: 100,
    verificationStatus: 'verified',
    riskScore: 8,
    lastVerified: '2025-06-08',
    capabilities: ['IT Services', 'Software Development', 'Data Analytics'],
    communityValidation: 'approved',
    revenuePerEmployee: 180000,
    contracts: 8,
    carbonFootprint: 'Carbon neutral',
    localEmployees: 22,
    trustScore: 97
  }
];

// Mock RFQs from government
const mockRFQs = [
  {
    id: 'RFQ-2025-001',
    title: 'IT Infrastructure Upgrade - Northern Ontario',
    department: 'Indigenous Services Canada',
    value: '$250,000 - $500,000',
    location: 'Thunder Bay, ON',
    deadline: '2025-06-25',
    requiredCapabilities: ['IT Services', 'Project Management'],
    indigenousRequirement: true,
    matchScore: 92
  },
  {
    id: 'RFQ-2025-002',
    title: 'Building Security Assessment - Federal Buildings',
    department: 'Public Works Canada',
    value: '$100,000 - $150,000',
    location: 'Winnipeg, MB',
    deadline: '2025-06-20',
    requiredCapabilities: ['Security Services', 'Facility Management'],
    indigenousRequirement: true,
    matchScore: 88
  },
  {
    id: 'RFQ-2025-003',
    title: 'Environmental Impact Study - Mining Project',
    department: 'Natural Resources Canada',
    value: '$150,000 - $300,000',
    location: 'Thunder Bay, ON',
    deadline: '2025-07-01',
    requiredCapabilities: ['Environmental Consulting', 'Project Management'],
    indigenousRequirement: true,
    matchScore: 85
  }
];

// Mock Vetted Suppliers Directory (including bad actors)
const mockSuppliers = [
  {
    id: 1,
    name: 'Norton Rose Fulbright Canada LLP',
    category: 'Legal Services',
    indigenousPartnership: 'Joint Venture with First Nations Legal Services',
    partnershipType: 'JV',
    ratings: {
      onTimeDelivery: 95,
      withinBudget: 88,
      respectingLocals: 98,
      indigenousEmployment: 15
    },
    carbonFootprint: 'Carbon Neutral (Certified)',
    location: 'Toronto, ON',
    status: 'verified',
    flags: []
  },
  {
    id: 2,
    name: 'DIALOG Architecture',
    category: 'Architecture & Design',
    indigenousPartnership: 'LP with Indigenous Design Collective',
    partnershipType: 'LP',
    ratings: {
      onTimeDelivery: 92,
      withinBudget: 85,
      respectingLocals: 96,
      indigenousEmployment: 22
    },
    carbonFootprint: '-45% below industry average',
    location: 'Vancouver, BC',
    status: 'verified',
    flags: []
  },
  {
    id: 3,
    name: 'QuickBuild Contractors Inc.',
    category: 'General Contractor',
    indigenousPartnership: 'Paper Partnership with Shell Nation Corp',
    partnershipType: 'Suspicious JV',
    ratings: {
      onTimeDelivery: 45,
      withinBudget: 38,
      respectingLocals: 22,
      indigenousEmployment: 2
    },
    carbonFootprint: '+80% above industry average',
    location: 'Toronto, ON',
    status: 'flagged',
    flags: ['Phantom partnership detected', 'Multiple compliance violations', 'Poor community relations']
  },
  {
    id: 4,
    name: 'PCL Construction',
    category: 'General Contractor',
    indigenousPartnership: 'Strategic Alliance with 6 Nations Construction',
    partnershipType: 'Strategic Alliance',
    ratings: {
      onTimeDelivery: 90,
      withinBudget: 87,
      respectingLocals: 94,
      indigenousEmployment: 18
    },
    carbonFootprint: 'Net Zero by 2030 commitment',
    location: 'Edmonton, AB',
    status: 'verified',
    flags: []
  },
  {
    id: 5,
    name: 'FlyByNight Consulting',
    category: 'Management Consulting',
    indigenousPartnership: 'Claims 51% Indigenous ownership (unverified)',
    partnershipType: 'Unverified',
    ratings: {
      onTimeDelivery: 31,
      withinBudget: 28,
      respectingLocals: 15,
      indigenousEmployment: 0
    },
    carbonFootprint: 'No data provided',
    location: 'Montreal, QC',
    status: 'blocked',
    flags: ['False Indigenous claims', 'Director overlap with 3 other flagged companies', 'No local presence']
  },
  {
    id: 6,
    name: 'Stantec Engineering',
    category: 'Engineering Services',
    indigenousPartnership: 'JV with Indigenous Engineering Solutions',
    partnershipType: 'JV',
    ratings: {
      onTimeDelivery: 93,
      withinBudget: 90,
      respectingLocals: 97,
      indigenousEmployment: 12
    },
    carbonFootprint: '-30% emissions reduction achieved',
    location: 'Ottawa, ON',
    status: 'verified',
    flags: []
  }
];

// Mock Ongoing Projects
const mockProjects = [
  {
    id: 1,
    name: 'Thunder Bay Community Center',
    community: 'Fort William First Nation',
    startDate: '2025-03-15',
    value: '$4.2M',
    localContractors: 8,
    jobsCreated: 45,
    indigenousJobs: 38,
    economicMultiplier: 2.3,
    carbonSavings: '120 tonnes CO2e',
    completion: 35,
    scope: 'Multi-purpose facility with cultural center, health services, and youth programs'
  },
  {
    id: 2,
    name: 'Solar Farm Installation',
    community: 'Six Nations of the Grand River',
    startDate: '2025-01-10',
    value: '$8.5M',
    localContractors: 12,
    jobsCreated: 67,
    indigenousJobs: 52,
    economicMultiplier: 3.1,
    carbonSavings: '850 tonnes CO2e annually',
    completion: 60,
    scope: '5MW solar installation providing clean energy to 1,200 homes'
  },
  {
    id: 3,
    name: 'Water Treatment Facility Upgrade',
    community: 'Lac Seul First Nation',
    startDate: '2024-11-20',
    value: '$12.3M',
    localContractors: 15,
    jobsCreated: 89,
    indigenousJobs: 71,
    economicMultiplier: 2.8,
    carbonSavings: '200 tonnes CO2e',
    completion: 75,
    scope: 'Modern water treatment ensuring safe drinking water for 3,000 residents'
  }
];

// Chart component for beautiful visualizations
const CircularProgress = ({ value, maxValue, label, color, size = 120 }: any) => {
  const percentage = (value / maxValue) * 100;
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-light">{value}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </div>
  );
};

// Animated metric card with glassmorphism
const MetricCard = ({ icon: Icon, title, value, change, color, delay = 0 }: any) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-white/20 backdrop-blur-xl border border-white/30
      p-6 transition-all duration-700 transform
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      hover:bg-white/25 hover:scale-[1.02] hover:shadow-2xl
      group cursor-pointer
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`
            p-3 rounded-xl bg-gradient-to-br ${color}
            shadow-lg transform transition-transform group-hover:scale-110
          `}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {change && (
            <div className={`flex items-center text-sm ${
              change > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {change > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span className="ml-1">{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        
        <h3 className="text-sm font-medium text-white/90 mb-1">{title}</h3>
        <p className="text-2xl font-light text-white">{value}</p>
      </div>
    </div>
  );
};

// Beautiful line chart component
const LineChart = ({ data, height = 200 }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); // emerald-500
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
    
    // Draw area
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    data.forEach((point: any, index: number) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (point / 100) * height;
      
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = ((index - 1) / (data.length - 1)) * width;
        const prevY = height - (data[index - 1] / 100) * height;
        const cp1x = prevX + (x - prevX) / 2;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) / 2;
        const cp2y = y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      }
    });
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    data.forEach((point: any, index: number) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (point / 100) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = ((index - 1) / (data.length - 1)) * width;
        const prevY = height - (data[index - 1] / 100) * height;
        const cp1x = prevX + (x - prevX) / 2;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) / 2;
        const cp2y = y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      }
    });
    
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // emerald-500
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw points
    data.forEach((point: any, index: number) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (point / 100) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [data, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={height}
      className="w-full"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

// Main POC Component
export default function IndigenousVerificationRFQPOC() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [verificationInProgress, setVerificationInProgress] = useState(false);
  const [matchedOpportunities, setMatchedOpportunities] = useState<any[]>([]);
  const [showAgentTools, setShowAgentTools] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showPublicDashboard, setShowPublicDashboard] = useState(false);

  // Simulate real-time data updates
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    activeUsers: 247,
    verificationsToday: 18,
    rfqsMatched: 12,
    fraudPrevented: 8.3
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeMetrics(prev => ({
        activeUsers: Math.max(0, prev.activeUsers + Math.floor(Math.random() * 5) - 2),
        verificationsToday: prev.verificationsToday + (Math.random() > 0.8 ? 1 : 0),
        rfqsMatched: prev.rfqsMatched + (Math.random() > 0.9 ? 1 : 0),
        fraudPrevented: +(prev.fraudPrevented + (Math.random() > 0.95 ? 0.1 : 0)).toFixed(1)
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Match businesses with RFQs
  useEffect(() => {
    const matches = mockRFQs.map(rfq => {
      const matchingBusinesses = mockBusinesses.filter(business => 
        business.verificationStatus === 'verified' &&
        business.capabilities.some(cap => rfq.requiredCapabilities.includes(cap)) &&
        business.location.includes(rfq.location.split(',')[1])
      );
      return { ...rfq, matchingBusinesses };
    });
    setMatchedOpportunities(matches);
  }, []);

  // Simulate real-time verification
  const runVerification = (business: any) => {
    setVerificationInProgress(true);
    setSelectedBusiness(business);
    
    // Simulate verification process
    setTimeout(() => {
      setVerificationInProgress(false);
    }, 3000);
  };

  const blobAnimation = `
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
  `;

  return (
    <>
      <style>{blobAnimation}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-amber-950 text-white">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10"
            style={{
              animation: 'blob 7s infinite',
              animationTimingFunction: 'ease-in-out'
            }}
          />
          <div 
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10"
            style={{
              animation: 'blob 7s infinite',
              animationDelay: '2s',
              animationTimingFunction: 'ease-in-out'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10"
            style={{
              animation: 'blob 7s infinite',
              animationDelay: '4s',
              animationTimingFunction: 'ease-in-out'
            }}
          />
        </div>

        {/* Header with glassmorphism */}
        <header className="relative z-20 bg-white/5 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-amber-600 rounded-lg blur opacity-75"></div>
                  <Shield className="relative h-8 w-8 text-white" />
                </div>
                <h1 className="ml-3 text-xl font-light">
                  Indigenous Business Verification & RFQ Platform
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowPublicDashboard(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-700/30 to-amber-700/30 backdrop-blur-md border border-emerald-600/30 rounded-full hover:from-emerald-700/40 hover:to-amber-700/40 transition-all flex items-center space-x-2"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Public Dashboard</span>
                </button>
                <button className="relative p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/20 transition-all">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                </button>
                <div className="flex items-center space-x-3 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
                  <div className="text-right">
                    <p className="text-sm font-medium">Admin User</p>
                    <p className="text-xs opacity-70">Indigenous Board Member</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-amber-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation with smooth transitions */}
        <nav className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {['dashboard', 'verification', 'rfq-matching', 'suppliers', 'projects', 'agent-tools', 'security', 'analytics'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                    transition-all duration-300 transform
                    ${activeTab === tab 
                      ? 'bg-gradient-to-r from-emerald-700/40 to-amber-700/40 backdrop-blur-md border border-emerald-600/40 shadow-lg scale-105' 
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }
                  `}
                >
                  {tab.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>
            {/* Dashboard View with enhanced visualizations */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Real-time metrics with beautiful animations */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <MetricCard 
                    icon={CheckCircle}
                    title="Verified Businesses"
                    value="2,847"
                    change={12}
                    color="from-emerald-600 to-teal-700"
                    delay={0}
                  />
                  <MetricCard 
                    icon={FileText}
                    title="Active RFQs"
                    value="156"
                    change={8}
                    color="from-teal-600 to-cyan-700"
                    delay={100}
                  />
                  <MetricCard 
                    icon={AlertTriangle}
                    title="Fraud Prevented"
                    value={`${realtimeMetrics.fraudPrevented.toFixed(1)}M`}
                    color="from-amber-600 to-orange-700"
                    delay={200}
                  />
                  <MetricCard 
                    icon={TrendingUp}
                    title="Match Success"
                    value="87%"
                    change={5}
                    color="from-emerald-700 to-green-800"
                    delay={300}
                  />
                  <MetricCard 
                    icon={Leaf}
                    title="Carbon Reduced"
                    value="1,170t"
                    change={23}
                    color="from-green-600 to-emerald-700"
                    delay={400}
                  />
                </div>

                {/* Live activity feed with glassmorphism */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Performance Chart */}
                  <div className="lg:col-span-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                    <h3 className="text-lg font-light mb-4 flex items-center justify-between">
                      Platform Performance
                      <span className="text-xs px-3 py-1 bg-emerald-600/30 text-emerald-300 rounded-full">
                        Live
                      </span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="opacity-70">Verification Success Rate</span>
                          <span>98.5%</span>
                        </div>
                        <LineChart data={[85, 88, 92, 90, 94, 95, 97, 98, 98.5]} />
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="text-center">
                          <Activity className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                          <p className="text-2xl font-light">{realtimeMetrics.activeUsers}</p>
                          <p className="text-xs opacity-70">Active Users</p>
                        </div>
                        <div className="text-center">
                          <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-400" />
                          <p className="text-2xl font-light">{realtimeMetrics.verificationsToday}</p>
                          <p className="text-xs opacity-70">Verifications Today</p>
                        </div>
                        <div className="text-center">
                          <Heart className="h-5 w-5 mx-auto mb-1 text-red-400" />
                          <p className="text-2xl font-light">{realtimeMetrics.rfqsMatched}</p>
                          <p className="text-xs opacity-70">RFQs Matched</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                    <h3 className="text-lg font-light mb-4">System Health</h3>
                    <div className="space-y-4">
                      {Object.entries(mockGovernmentSystems).map(([system, data]) => (
                        <div key={system} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{system}</span>
                            <span className="text-xs opacity-90">{data.reliability}%</span>
                          </div>
                          <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                                data.status === 'connected' ? 'bg-emerald-500' : 
                                data.status === 'syncing' ? 'bg-amber-500 animate-pulse' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${data.reliability}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Impact visualization */}
                <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                  <h3 className="text-lg font-light mb-6">Economic & Environmental Impact</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <CircularProgress 
                        value={487}
                        maxValue={600}
                        label="$M Facilitated"
                        color="#10b981"
                      />
                    </div>
                    <div className="text-center">
                      <CircularProgress 
                        value={18.5}
                        maxValue={25}
                        label="K Jobs Created"
                        color="#14b8a6"
                      />
                    </div>
                    <div className="text-center">
                      <CircularProgress 
                        value={127}
                        maxValue={150}
                        label="Communities"
                        color="#059669"
                      />
                    </div>
                    <div className="text-center">
                      <CircularProgress 
                        value={1170}
                        maxValue={1500}
                        label="t CO2e Saved"
                        color="#065f46"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verification View with enhanced UI */}
            {activeTab === 'verification' && (
              <div className="space-y-6">
                <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-white/10 border-b border-white/10">
                    <h2 className="text-lg font-light">Business Verification Queue</h2>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                      {mockBusinesses.map((business, index) => (
                        <div 
                          key={business.id} 
                          className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.01]"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-medium">{business.name}</h3>
                                <div className="flex items-center space-x-2">
                                  <div className={`
                                    px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md
                                    ${business.verificationStatus === 'verified' 
                                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-600/40' 
                                      : 'bg-amber-600/30 text-amber-300 border border-amber-600/40'
                                    }
                                  `}>
                                    {business.verificationStatus}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                      business.trustScore > 90 ? 'bg-emerald-600/30' :
                                      business.trustScore > 70 ? 'bg-teal-600/30' :
                                      business.trustScore > 50 ? 'bg-amber-600/30' :
                                      'bg-red-600/30'
                                    }`}>
                                      <span className="text-xs font-medium">{business.trustScore}</span>
                                    </div>
                                    <span className="text-xs opacity-80 ml-1">Trust Score</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                <div>
                                  <p className="opacity-70">Location</p>
                                  <p className="font-medium flex items-center">
                                    <MapPin className="h-4 w-4 mr-1 opacity-50" />
                                    {business.location}
                                  </p>
                                </div>
                                <div>
                                  <p className="opacity-70">Indigenous Ownership</p>
                                  <p className="font-medium">{business.indigenousOwnership}%</p>
                                </div>
                                <div>
                                  <p className="opacity-80">Risk Score</p>
                                  <p className={`font-medium ${
                                    business.riskScore < 20 ? 'text-emerald-400' :
                                    business.riskScore < 50 ? 'text-amber-400' :
                                    'text-red-400'
                                  }`}>
                                    {business.riskScore}%
                                  </p>
                                </div>
                                <div>
                                  <p className="opacity-80">Local Employees</p>
                                  <p className="font-medium">{business.localEmployees}</p>
                                </div>
                                <div>
                                  <p className="opacity-80">Carbon Footprint</p>
                                  <p className="font-medium text-emerald-400">{business.carbonFootprint}</p>
                                </div>
                              </div>

                              {/* Fraud Indicators */}
                              {business.revenuePerEmployee > 400000 && (
                                <div className="mt-3 p-3 bg-red-600/15 border border-red-600/30 rounded-lg backdrop-blur-md">
                                  <div className="flex items-center text-red-300">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    <span className="text-sm">
                                      High revenue per employee ratio detected (${business.revenuePerEmployee.toLocaleString()})
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Capabilities */}
                              <div className="mt-3 flex items-center justify-between">
                                <div>
                                  <p className="text-sm opacity-70 mb-1">Capabilities:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {business.capabilities.map(cap => (
                                      <span key={cap} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                                        {cap}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="ml-4 flex flex-col space-y-2">
                              <button
                                onClick={() => runVerification(business)}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 flex items-center"
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${verificationInProgress && selectedBusiness?.id === business.id ? 'animate-spin' : ''}`} />
                                Verify
                              </button>
                              <button className="px-4 py-2 bg-white/15 backdrop-blur-md border border-white/30 rounded-lg hover:bg-white/20 transition-all flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Verification Details Modal with glassmorphism */}
                {verificationInProgress && selectedBusiness && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-600/30 rounded-2xl p-8 max-w-2xl w-full mx-4 transform transition-all">
                      <h3 className="text-xl font-light mb-6">Verifying {selectedBusiness.name}</h3>
                      
                      <div className="space-y-4">
                        {[
                          'Checking CRA tax compliance...',
                          'Verifying ISED incorporation status...',
                          'Confirming Indigenous certification with ISC...',
                          'Analyzing ownership structure for fraud patterns...',
                          'Requesting community validation...'
                        ].map((step, index) => (
                          <div key={index} className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-600/40 flex items-center justify-center mr-3">
                              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                            <span className="opacity-80">{step}</span>
                          </div>
                        ))}
                      </div>
                      
                      <button 
                        onClick={() => setVerificationInProgress(false)}
                        className="mt-6 px-4 py-2 bg-white/15 backdrop-blur-md border border-white/30 rounded-lg hover:bg-white/20 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Suppliers View with bad actors */}
            {activeTab === 'suppliers' && (
              <div className="space-y-6">
                <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-white/15 border-b border-white/20">
                    <h2 className="text-lg font-light">Vetted Supplier Directory</h2>
                    <p className="text-sm opacity-80 mt-1">AI-powered fraud detection identifies and blocks bad actors</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {mockSuppliers.map((supplier, index) => (
                        <div 
                          key={supplier.id} 
                          className={`
                            backdrop-blur-md border rounded-xl p-4 transition-all duration-300 transform hover:scale-[1.01]
                            ${supplier.status === 'verified' ? 'bg-white/15 border-white/20 hover:bg-white/20' :
                              supplier.status === 'flagged' ? 'bg-amber-600/20 border-amber-600/30' :
                              'bg-red-600/20 border-red-600/30'}
                          `}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-medium flex items-center">
                                  {supplier.name}
                                  {supplier.status === 'blocked' && (
                                    <X className="h-5 w-5 text-red-400 ml-2" />
                                  )}
                                  {supplier.status === 'flagged' && (
                                    <AlertTriangle className="h-5 w-5 text-yellow-400 ml-2" />
                                  )}
                                </h3>
                                <span className={`
                                  px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md
                                  ${supplier.status === 'verified' ? 'bg-teal-600/30 text-teal-300 border border-teal-600/40' :
                                    supplier.status === 'flagged' ? 'bg-amber-600/30 text-amber-300 border border-amber-600/40' :
                                    'bg-red-600/30 text-red-300 border border-red-600/40'}
                                `}>
                                  {supplier.category}
                                </span>
                              </div>
                              
                              <div className="mb-3 space-y-1">
                                <p className="text-sm">
                                  <span className="opacity-70">Partnership:</span> 
                                  <span className={supplier.status !== 'verified' ? 'text-yellow-300' : ''}> {supplier.indigenousPartnership}</span>
                                </p>
                                <p className="text-sm">
                                  <span className="opacity-70">Structure:</span> {supplier.partnershipType}
                                </p>
                                <p className="text-sm">
                                  <span className="opacity-80">Carbon Footprint:</span> 
                                  <span className={`ml-1 ${
                                    supplier.carbonFootprint.includes('-') || supplier.carbonFootprint.includes('Neutral') || supplier.carbonFootprint.includes('Net Zero') 
                                      ? 'text-emerald-400' 
                                      : supplier.carbonFootprint.includes('+') 
                                        ? 'text-red-400' 
                                        : 'text-gray-400'
                                  }`}>
                                    {supplier.carbonFootprint}
                                  </span>
                                </p>
                              </div>

                              {/* Warning flags for bad actors */}
                              {supplier.flags.length > 0 && (
                                <div className="mb-3 p-3 bg-red-600/15 border border-red-600/30 rounded-lg backdrop-blur-md">
                                  <p className="text-sm font-medium text-red-300 mb-1">Warning Flags:</p>
                                  <ul className="text-xs text-red-200 space-y-1">
                                    {supplier.flags.map((flag, i) => (
                                      <li key={i}>• {flag}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Performance Ratings */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className={`text-2xl font-light ${
                                    supplier.ratings.onTimeDelivery > 80 ? 'text-teal-400' :
                                    supplier.ratings.onTimeDelivery > 60 ? 'text-amber-400' :
                                    'text-red-400'
                                  }`}>
                                    {supplier.ratings.onTimeDelivery}%
                                  </div>
                                  <p className="text-xs opacity-80">On-Time Delivery</p>
                                </div>
                                <div className="text-center">
                                  <div className={`text-2xl font-light ${
                                    supplier.ratings.withinBudget > 80 ? 'text-emerald-400' :
                                    supplier.ratings.withinBudget > 60 ? 'text-amber-400' :
                                    'text-red-400'
                                  }`}>
                                    {supplier.ratings.withinBudget}%
                                  </div>
                                  <p className="text-xs opacity-80">Within Budget</p>
                                </div>
                                <div className="text-center">
                                  <div className={`text-2xl font-light ${
                                    supplier.ratings.respectingLocals > 80 ? 'text-cyan-400' :
                                    supplier.ratings.respectingLocals > 60 ? 'text-amber-400' :
                                    'text-red-400'
                                  }`}>
                                    {supplier.ratings.respectingLocals}%
                                  </div>
                                  <p className="text-xs opacity-80">Community Respect</p>
                                </div>
                                <div className="text-center">
                                  <div className={`text-2xl font-light ${
                                    supplier.ratings.indigenousEmployment > 15 ? 'text-orange-400' :
                                    supplier.ratings.indigenousEmployment > 5 ? 'text-amber-400' :
                                    'text-red-400'
                                  }`}>
                                    {supplier.ratings.indigenousEmployment}%
                                  </div>
                                  <p className="text-xs opacity-80">Indigenous Employment</p>
                                </div>
                              </div>
                            </div>

                            {supplier.status === 'blocked' && (
                              <div className="ml-4 px-4 py-2 bg-red-600/30 border border-red-600/40 rounded-lg">
                                <span className="text-sm font-medium text-red-300">BLOCKED</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Projects View */}
            {activeTab === 'projects' && (
              <div className="space-y-6">
                <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-white/15 border-b border-white/20">
                    <h2 className="text-lg font-light">Ongoing Indigenous Projects</h2>
                    <p className="text-sm opacity-80 mt-1">Real-time tracking of community impact and economic development</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {mockProjects.map((project, index) => (
                        <div 
                          key={project.id} 
                          className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-[1.01]"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-medium">{project.name}</h3>
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm opacity-80">Completion:</span>
                                  <div className="w-32 bg-white/20 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-1000"
                                      style={{width: `${project.completion}%`}}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">{project.completion}%</span>
                                </div>
                              </div>
                              
                              <div className="mb-3">
                                <p className="text-sm opacity-70">
                                  <span className="font-medium">Community:</span> {project.community}
                                </p>
                                <p className="text-sm opacity-70 mt-1">{project.scope}</p>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                                <div className="bg-white/15 rounded-lg p-2">
                                  <div className="text-xl font-light text-emerald-400">{project.value}</div>
                                  <p className="text-xs opacity-80">Project Value</p>
                                </div>
                                <div className="bg-white/15 rounded-lg p-2">
                                  <div className="text-xl font-light text-teal-400">{project.jobsCreated}</div>
                                  <p className="text-xs opacity-80">Jobs Created</p>
                                </div>
                                <div className="bg-white/15 rounded-lg p-2">
                                  <div className="text-xl font-light text-amber-400">{project.indigenousJobs}</div>
                                  <p className="text-xs opacity-80">Indigenous Jobs</p>
                                </div>
                                <div className="bg-white/15 rounded-lg p-2">
                                  <div className="text-xl font-light text-orange-400">{project.localContractors}</div>
                                  <p className="text-xs opacity-80">Local Contractors</p>
                                </div>
                                <div className="bg-white/15 rounded-lg p-2">
                                  <div className="text-xl font-light text-cyan-400">{project.economicMultiplier}x</div>
                                  <p className="text-xs opacity-80">Economic Multiplier</p>
                                </div>
                                <div className="bg-white/15 rounded-lg p-2">
                                  <div className="text-lg font-light text-emerald-400">{project.carbonSavings}</div>
                                  <p className="text-xs opacity-80">Carbon Savings</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Impact Summary with glassmorphism */}
                <div className="bg-gradient-to-r from-emerald-700/30 to-teal-700/30 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                  <h3 className="text-lg font-light mb-4">Cumulative Project Impact</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="bg-white/20 rounded-xl p-4">
                      <div className="text-3xl font-light text-emerald-400">$25M+</div>
                      <p className="text-sm opacity-80">Total Investment</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4">
                      <div className="text-3xl font-light text-teal-400">201</div>
                      <p className="text-sm opacity-80">Total Jobs Created</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4">
                      <div className="text-3xl font-light text-amber-400">2.7x</div>
                      <p className="text-sm opacity-80">Avg Economic Multiplier</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4">
                      <div className="text-3xl font-light text-emerald-400">1,170t</div>
                      <p className="text-sm opacity-80">CO2e Reduced</p>
                    </div>
                  </div>
                </div>

                {/* Contract Templates Integration */}
                <div className="mt-6">
                  <ContractTemplates />
                </div>
              </div>
            )}

            {/* Agent Tools View */}
            {activeTab === 'agent-tools' && (
              <div className="space-y-6">
                <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-white/15 border-b border-white/20 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-light">Sovereignty Agent Tools</h2>
                      <p className="text-sm opacity-80 mt-1">Field tools for Indigenous verification agents</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`
                        px-4 py-2 rounded-full text-sm font-medium flex items-center backdrop-blur-md
                        ${offlineMode 
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-600/40' 
                          : 'bg-emerald-600/30 text-emerald-300 border border-emerald-600/40'
                        }
                      `}>
                        {offlineMode ? (
                          <>
                            <WifiOff className="h-4 w-4 mr-2" />
                            Offline Mode
                          </>
                        ) : (
                          <>
                            <Wifi className="h-4 w-4 mr-2" />
                            Online - Synced
                          </>
                        )}
                      </span>
                      <button
                        onClick={() => setOfflineMode(!offlineMode)}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        Toggle Mode
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Document Scanning Tools */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-blue-400" />
                          Document Verification Tools
                        </h3>
                        <div className="space-y-3">
                          {[
                            'Scan Indian Status Card',
                            'Verify Band Membership Certificate',
                            'Capture Business Registration',
                            'Process Annual Declaration'
                          ].map((tool, index) => (
                            <button 
                              key={index}
                              className="w-full text-left p-3 bg-white/15 rounded-lg hover:bg-white/20 transition-all flex items-center justify-between group"
                            >
                              <span>{tool}</span>
                              <ChevronRight className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Database Access Tools */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <Search className="h-5 w-5 mr-2 text-emerald-400" />
                          Government Database Access
                        </h3>
                        <div className="space-y-3">
                          {[
                            { title: 'Corporate Registry Check', desc: 'Verify incorporation status' },
                            { title: 'Annual Filing Status', desc: 'Check compliance with declarations' },
                            { title: 'Indigenous Employee Count', desc: 'Verify employment statistics' },
                            { title: 'Director/Ownership Search', desc: 'Cross-reference ownership structure' }
                          ].map((item, index) => (
                            <div key={index} className="p-3 bg-white/15 rounded-lg">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs opacity-80">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Field Verification Checklist */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-purple-400" />
                          Field Verification Checklist
                        </h3>
                        <div className="space-y-2">
                          {[
                            'Physical business location verified',
                            'Indigenous ownership documents collected',
                            'Employee count confirmed on-site',
                            'Community elder validation obtained',
                            'Local hiring practices reviewed',
                            'Environmental practices assessed'
                          ].map((item, index) => (
                            <label key={index} className="flex items-center space-x-2 text-sm cursor-pointer hover:text-emerald-300 transition-colors">
                              <input type="checkbox" className="rounded border-white/30 bg-white/15 text-emerald-600 focus:ring-emerald-500" />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <RefreshCw className="h-5 w-5 mr-2 text-orange-400" />
                          Quick Actions
                        </h3>
                        <div className="space-y-2">
                          <button className="w-full p-2 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-[1.02]">
                            Submit Verification Report
                          </button>
                          <button className="w-full p-2 bg-gradient-to-r from-teal-600 to-cyan-700 rounded-lg hover:from-teal-700 hover:to-cyan-800 transition-all transform hover:scale-[1.02]">
                            Request Community Validation
                          </button>
                          <button className="w-full p-2 bg-gradient-to-r from-amber-600 to-orange-700 rounded-lg hover:from-amber-700 hover:to-orange-800 transition-all transform hover:scale-[1.02]">
                            Flag for Review
                          </button>
                          <button className="w-full p-2 bg-white/15 backdrop-blur-md border border-white/30 rounded-lg hover:bg-white/20 transition-all">
                            Save Draft (Offline)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security View with enhanced visuals */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-white/15 border-b border-white/20">
                    <h2 className="text-lg font-light">Security & Data Protection</h2>
                    <p className="text-sm opacity-80 mt-1">Government-grade security measures protecting Indigenous data sovereignty</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Encryption Status */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <Shield className="h-5 w-5 mr-2 text-green-400" />
                          Data Encryption Status
                        </h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Data at Rest', value: 'AES-256 Encrypted', status: 'secure' },
                            { label: 'Data in Transit', value: 'TLS 1.3', status: 'secure' },
                            { label: 'Database Encryption', value: 'Full Disk Encryption', status: 'secure' },
                            { label: 'Document Storage', value: 'Client-Side Encrypted', status: 'secure' }
                          ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white/15 rounded-lg">
                              <span className="text-sm">{item.label}</span>
                              <div className="flex items-center">
                                <Lock className="h-4 w-4 text-emerald-400 mr-2" />
                                <span className="text-sm font-medium text-emerald-400">{item.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Access Control */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <Users className="h-5 w-5 mr-2 text-teal-400" />
                          Access Control & Authentication
                        </h3>
                        <div className="space-y-3">
                          {[
                            { title: 'Multi-Factor Authentication', desc: 'Required for all government users' },
                            { title: 'Role-Based Access Control', desc: 'Granular permissions by user type' },
                            { title: 'Indigenous Data Governance', desc: 'Community-controlled access rights' }
                          ].map((item, index) => (
                            <div key={index} className="p-3 bg-teal-600/20 border border-teal-600/30 rounded-lg">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs opacity-80">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Compliance & Auditing */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2 text-amber-400" />
                          Compliance & Auditing
                        </h3>
                        <div className="space-y-3">
                          {[
                            { label: 'PIPEDA Compliance', status: true },
                            { label: 'SOC 2 Type II', status: true },
                            { label: 'Government Security Clearance', status: true },
                            { label: 'Annual Security Audit', status: 'Next: Aug 2025' }
                          ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white/15 rounded-lg">
                              <span className="text-sm">{item.label}</span>
                              {item.status === true ? (
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <span className="text-xs opacity-80">{item.status}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Real-time Monitoring */}
                      <div className="bg-white/15 border border-white/20 rounded-xl p-4">
                        <h3 className="font-medium mb-4 flex items-center">
                          <Eye className="h-5 w-5 mr-2 text-orange-400" />
                          Real-time Security Monitoring
                        </h3>
                        <div className="space-y-3">
                          <div className="p-3 bg-emerald-600/20 border border-emerald-600/30 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">System Status</span>
                              <span className="text-xs text-emerald-400">All Systems Operational</span>
                            </div>
                            <div className="text-xs opacity-80">Last incident: 127 days ago</div>
                          </div>
                          <div className="space-y-2">
                            {[
                              { label: 'Failed Login Attempts (24h)', value: 3 },
                              { label: 'Suspicious Activities Blocked', value: 17 },
                              { label: 'Active Security Alerts', value: 0, color: 'text-emerald-400' }
                            ].map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.label}</span>
                                <span className={`font-medium ${item.color || ''}`}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics View */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                    <h3 className="text-lg font-light mb-4">Verification Performance</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Average Verification Time', value: '24 hours', color: 'text-emerald-400' },
                        { label: 'Multi-System Accuracy', value: '99.2%', color: 'text-teal-400' },
                        { label: 'Community Validation Rate', value: '94%', color: 'text-cyan-400' },
                        { label: 'Fraud Detection Success', value: '100%', color: 'text-amber-400' }
                      ].map((metric, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white/15 rounded-lg hover:bg-white/20 transition-all">
                          <span className="opacity-80">{metric.label}</span>
                          <span className={`font-medium ${metric.color}`}>{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                    <h3 className="text-lg font-light mb-4">RFQ Matching Impact</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Total Contracts Facilitated', value: '$487M', color: 'text-emerald-400' },
                        { label: 'Average Match Quality', value: '87%', color: 'text-teal-400' },
                        { label: 'Business Growth Rate', value: '+34%', color: 'text-amber-400' },
                        { label: 'Cost Savings (Gov)', value: '$52M', color: 'text-orange-400' }
                      ].map((metric, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white/15 rounded-lg hover:bg-white/20 transition-all">
                          <span className="opacity-80">{metric.label}</span>
                          <span className={`font-medium ${metric.color}`}>{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fraud Prevention Dashboard with enhanced visuals */}
                <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-white/15 border-b border-white/20">
                    <h3 className="text-lg font-light">Fraud Prevention Impact</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-amber-600/20 rounded-full mb-3">
                          <div className="text-3xl font-light text-amber-400">23</div>
                        </div>
                        <p className="opacity-80">Phantom Partnerships Blocked</p>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-orange-600/20 rounded-full mb-3">
                          <div className="text-3xl font-light text-orange-400">$8.3M</div>
                        </div>
                        <p className="opacity-80">Fraudulent Claims Prevented</p>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-600/20 rounded-full mb-3">
                          <div className="text-3xl font-light text-emerald-400">100%</div>
                        </div>
                        <p className="opacity-80">Verification Accuracy</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-600/20 border border-amber-600/30 rounded-xl">
                      <h4 className="font-medium text-amber-300 mb-2">Common Fraud Patterns Detected:</h4>
                      <ul className="text-sm text-amber-200 space-y-1">
                        <li>• Revenue per employee exceeding $400K threshold (6 cases)</li>
                        <li>• Shared addresses between "independent" companies (4 cases)</li>
                        <li>• Ownership changes within 90 days of contract awards (8 cases)</li>
                        <li>• Director overlap across multiple Indigenous claims (5 cases)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Compliance Reporting Integration */}
                <div className="mt-6">
                  <ComplianceReporting />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Public Dashboard Modal - Simplified */}
        {showPublicDashboard && (
          <div className="fixed inset-0 bg-black/90 z-50 overflow-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-slate-900 border border-emerald-600/30 rounded-2xl max-w-6xl w-full shadow-2xl">
                <div className="px-6 py-4 bg-slate-800 border-b border-emerald-600/30 flex justify-between items-center">
                  <h2 className="text-xl font-light">Public Transparency Dashboard</h2>
                  <button
                    onClick={() => setShowPublicDashboard(false)}
                    className="p-2 bg-emerald-600/20 rounded-full hover:bg-emerald-600/30 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6">
                  {/* Public Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-light mb-2">Indigenous Procurement Transparency Initiative</h3>
                    <p className="opacity-70">Real-time data on Canada's Indigenous business verification and procurement matching</p>
                  </div>

                  {/* Key Public Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-slate-800 border border-emerald-600/30 rounded-xl p-6 text-center">
                      <div className="text-3xl font-light text-emerald-400 mb-2">2,847</div>
                      <p className="text-sm opacity-80">Verified Indigenous Businesses</p>
                    </div>
                    <div className="bg-slate-800 border border-emerald-600/30 rounded-xl p-6 text-center">
                      <div className="text-3xl font-light text-teal-400 mb-2">$487M</div>
                      <p className="text-sm opacity-80">Contracts Facilitated</p>
                    </div>
                    <div className="bg-slate-800 border border-emerald-600/30 rounded-xl p-6 text-center">
                      <div className="text-3xl font-light text-amber-400 mb-2">18,500</div>
                      <p className="text-sm opacity-80">Jobs Created</p>
                    </div>
                    <div className="bg-slate-800 border border-emerald-600/30 rounded-xl p-6 text-center">
                      <div className="text-3xl font-light text-emerald-400 mb-2">1,170t</div>
                      <p className="text-sm opacity-80">CO2e Reduced</p>
                    </div>
                  </div>

                  {/* Geographic Distribution */}
                  <div className="bg-slate-800 border border-emerald-600/30 rounded-xl p-6 mb-6">
                    <h4 className="text-lg font-light mb-4">Provincial Distribution</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { province: 'Ontario', businesses: 847, value: '$142M' },
                        { province: 'British Columbia', businesses: 623, value: '$98M' },
                        { province: 'Alberta', businesses: 456, value: '$87M' },
                        { province: 'Manitoba', businesses: 389, value: '$65M' },
                        { province: 'Saskatchewan', businesses: 234, value: '$43M' },
                        { province: 'Quebec', businesses: 198, value: '$32M' },
                        { province: 'Atlantic', businesses: 87, value: '$15M' },
                        { province: 'Territories', businesses: 13, value: '$5M' }
                      ].map((item, index) => (
                        <div key={index} className="bg-slate-700 rounded-lg p-3">
                          <p className="font-medium">{item.province}</p>
                          <p className="text-sm text-teal-400">{item.businesses} businesses</p>
                          <p className="text-sm text-emerald-400">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Environmental Impact */}
                  <div className="bg-slate-800 border border-emerald-600/30 rounded-xl p-6 mb-6">
                    <h4 className="text-lg font-light mb-4">Environmental & Social Impact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-2xl font-light text-emerald-400 mb-1">82%</p>
                        <p className="text-sm opacity-80">Projects include environmental benefits</p>
                      </div>
                      <div>
                        <p className="text-2xl font-light text-teal-400 mb-1">2.7x</p>
                        <p className="text-sm opacity-80">Average economic multiplier</p>
                      </div>
                      <div>
                        <p className="text-2xl font-light text-amber-400 mb-1">127</p>
                        <p className="text-sm opacity-80">Communities served nationwide</p>
                      </div>
                    </div>
                  </div>

                  {/* Transparency Commitment */}
                  <div className="bg-slate-800 border border-emerald-600/30 rounded-xl p-6 text-center">
                    <h4 className="text-lg font-light mb-2">Our Transparency Commitment</h4>
                    <p className="text-sm opacity-80 max-w-3xl mx-auto">
                      This dashboard represents our commitment to radical transparency in Indigenous procurement. 
                      All data is updated in real-time and subject to Indigenous-majority governance oversight. 
                      We believe that transparency builds trust and accountability in public procurement.
                    </p>
                    <div className="mt-4 flex justify-center space-x-4">
                      <button className="px-4 py-2 bg-emerald-600/20 border border-emerald-600/30 rounded-lg hover:bg-emerald-600/30 transition-all text-sm">
                        Download Full Report
                      </button>
                      <button className="px-4 py-2 bg-teal-600/20 border border-teal-600/30 rounded-lg hover:bg-teal-600/30 transition-all text-sm">
                        API Access
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="relative z-10 bg-white/10 backdrop-blur-xl border-t border-white/20 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-sm opacity-80">
                Indigenous Business Verification & RFQ Platform
              </p>
              <p className="text-xs opacity-60 mt-2">
                Powered by Indigenous-majority governance • Built with transparency and trust
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}