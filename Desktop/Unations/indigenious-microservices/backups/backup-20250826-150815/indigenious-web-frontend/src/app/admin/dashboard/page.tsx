'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Cloud, 
  Database, 
  GitBranch, 
  Globe, 
  Shield, 
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Zap,
  Lock,
  Mail,
  Cpu,
  HardDrive,
  Grid
} from 'lucide-react';

// System Status Component
const SystemStatus = ({ name, status, details, icon: Icon }: any) => {
  const statusColors: Record<string, string> = {
    healthy: 'text-green-500 bg-green-50',
    warning: 'text-yellow-500 bg-yellow-50',
    error: 'text-red-500 bg-red-50',
    unknown: 'text-gray-500 bg-gray-50'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        <Icon className={`h-4 w-4 ${(statusColors[status] || statusColors.unknown).split(' ')[0]}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[status] || statusColors.unknown}>
            {status.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">{details}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
export default function AdminDashboard() {
  const [systems, setSystems] = useState({
    gitops: { status: 'healthy', details: 'All apps synced' },
    canary: { status: 'healthy', details: '0 rollbacks today' },
    infrastructure: { status: 'healthy', details: 'All resources running' },
    monitoring: { status: 'healthy', details: 'All metrics collecting' },
    database: { status: 'healthy', details: 'Connections: 45/100' },
    cdn: { status: 'healthy', details: 'Cache hit: 94%' },
    security: { status: 'healthy', details: 'No threats detected' },
    email: { status: 'healthy', details: 'Queue: 0 pending' },
    payments: { status: 'healthy', details: 'Stripe connected' },
    storage: { status: 'warning', details: 'Usage: 78%' }
  });

  const [metrics, setMetrics] = useState({
    activeUsers: 1247,
    rfqsToday: 34,
    bidsToday: 128,
    revenue: 45670,
    uptime: 99.98,
    responseTime: 145,
    errorRate: 0.02,
    deployments: 3
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 10 - 5),
        responseTime: Math.max(50, prev.responseTime + Math.floor(Math.random() * 20 - 10))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground">
            Everything you need to know at a glance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            All Systems Operational
          </Badge>
          <span className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-500" /> +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFQs Today</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rfqsToday}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.bidsToday} bids submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (24h)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Platform fees collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <SystemStatus 
            name="GitOps (ArgoCD)" 
            status={systems.gitops.status}
            details={systems.gitops.details}
            icon={GitBranch}
          />
          <SystemStatus 
            name="Canary (Flagger)" 
            status={systems.canary.status}
            details={systems.canary.details}
            icon={Activity}
          />
          <SystemStatus 
            name="Infrastructure" 
            status={systems.infrastructure.status}
            details={systems.infrastructure.details}
            icon={Cloud}
          />
          <SystemStatus 
            name="Monitoring" 
            status={systems.monitoring.status}
            details={systems.monitoring.details}
            icon={Activity}
          />
          <SystemStatus 
            name="Database" 
            status={systems.database.status}
            details={systems.database.details}
            icon={Database}
          />
          <SystemStatus 
            name="CDN" 
            status={systems.cdn.status}
            details={systems.cdn.details}
            icon={Globe}
          />
          <SystemStatus 
            name="Security (WAF)" 
            status={systems.security.status}
            details={systems.security.details}
            icon={Shield}
          />
          <SystemStatus 
            name="Email Service" 
            status={systems.email.status}
            details={systems.email.details}
            icon={Mail}
          />
          <SystemStatus 
            name="Payments" 
            status={systems.payments.status}
            details={systems.payments.details}
            icon={DollarSign}
          />
          <SystemStatus 
            name="Storage" 
            status={systems.storage.status}
            details={systems.storage.details}
            icon={HardDrive}
          />
        </div>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs className="space-y-4">
        <TabsList>
          <TabsTrigger>Performance</TabsTrigger>
          <TabsTrigger>Deployments</TabsTrigger>
          <TabsTrigger>Security</TabsTrigger>
          <TabsTrigger>Business</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
                <CardDescription>Average API response time (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.responseTime}ms</div>
                <Progress value={metrics.responseTime / 5} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Target: &lt;200ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
                <CardDescription>Percentage of failed requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.errorRate}%</div>
                <Progress value={metrics.errorRate * 100} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Target: &lt;1%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deployments</CardTitle>
              <CardDescription>Last 5 deployments to production</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { version: 'v1.2.45', status: 'success', time: '2 hours ago', duration: '12m' },
                  { version: 'v1.2.44', status: 'success', time: '8 hours ago', duration: '11m' },
                  { version: 'v1.2.43', status: 'rollback', time: '1 day ago', duration: '3m' },
                  { version: 'v1.2.42', status: 'success', time: '2 days ago', duration: '13m' },
                  { version: 'v1.2.41', status: 'success', time: '3 days ago', duration: '10m' }
                ].map((deploy, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-2">
                      {deploy.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="font-medium">{deploy.version}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{deploy.time}</span>
                      <span>{deploy.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Blocked Attacks</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">142</div>
                <p className="text-xs text-muted-foreground">
                  WAF blocked requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SSL Grade</CardTitle>
                <CardDescription>Certificate health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">A+</div>
                <p className="text-xs text-muted-foreground">
                  Expires in 67 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auth Failures</CardTitle>
                <CardDescription>Failed login attempts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">
                  Normal range
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Indigenous Business Growth</CardTitle>
                <CardDescription>New registrations this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">127</div>
                <Progress value={75} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  75% of monthly target
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contract Value</CardTitle>
                <CardDescription>Total RFQ value this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$2.4M</div>
                <p className="text-xs text-muted-foreground">
                  Across 89 active RFQs
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <button 
              onClick={() => window.open('/admin/dashboard/mission-control', '_blank')}
              className="p-3 text-left rounded-lg border hover:bg-muted"
            >
              <Activity className="h-4 w-4 mb-1" />
              <div className="font-medium">Mission Control</div>
              <div className="text-xs text-muted-foreground">NASA-style monitoring</div>
            </button>
            <button 
              onClick={() => window.open('/admin/dashboard/quadrant', '_blank')}
              className="p-3 text-left rounded-lg border hover:bg-muted"
            >
              <Grid className="h-4 w-4 mb-1" />
              <div className="font-medium">Glass Dashboard</div>
              <div className="text-xs text-muted-foreground">Premium glass UI</div>
            </button>
            <button className="p-3 text-left rounded-lg border hover:bg-muted">
              <GitBranch className="h-4 w-4 mb-1" />
              <div className="font-medium">Deployment History</div>
              <div className="text-xs text-muted-foreground">See all deployments</div>
            </button>
            <button className="p-3 text-left rounded-lg border hover:bg-muted">
              <Mail className="h-4 w-4 mb-1" />
              <div className="font-medium">Email Queue</div>
              <div className="text-xs text-muted-foreground">0 pending emails</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}