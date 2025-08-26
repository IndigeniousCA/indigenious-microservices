/**
 * Performance Dashboard
 * Real-time monitoring and visualization for Business Hunter Swarm
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { createLogger } from '../core/utils/logger';
import { AnalyticsEngine } from './AnalyticsEngine';
import {
  SystemMetrics,
  HunterPerformanceMetrics,
  OutreachPerformanceMetrics,
  AnalyticsPeriod,
  PriorityTier
} from '../types/enhanced-types';

export interface DashboardConfig {
  refreshInterval: number; // ms
  enableRealTime: boolean;
  enableAlerts: boolean;
  retentionDays: number;
}

export interface DashboardData {
  overview: SystemOverview;
  hunters: HuntersDashboard;
  outreach: OutreachDashboard;
  businesses: BusinessesDashboard;
  alerts: Alert[];
  insights: Insight[];
}

export interface SystemOverview {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: string;
  discoveryRate: string;
  conversionRate: string;
  totalBusinesses: number;
  totalCampaigns: number;
  activeHunters: number;
  queueDepth: number;
  lastUpdated: Date;
}

export interface HuntersDashboard {
  activeCount: number;
  totalDiscovered: number;
  discoveryTrend: TrendData[];
  topPerformers: HunterSummary[];
  errorRate: number;
  avgResponseTime: number;
  sourceBreakdown: SourceBreakdown[];
}

export interface OutreachDashboard {
  activeCampaigns: number;
  totalSent: number;
  engagementRate: number;
  conversionFunnel: FunnelData;
  channelPerformance: ChannelMetrics[];
  roi: ROISummary;
  topTemplates: TemplateSummary[];
}

export interface BusinessesDashboard {
  total: number;
  byTier: TierBreakdown;
  byProvince: ProvinceBreakdown;
  byIndustry: IndustryBreakdown;
  recentlyDiscovered: BusinessSummary[];
  verificationRate: number;
  indigenousCount: number;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  actions?: string[];
}

export interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'milestone';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  data?: any;
}

export interface TrendData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface HunterSummary {
  id: string;
  type: string;
  discovered: number;
  successRate: number;
  status: 'active' | 'idle' | 'error';
}

export interface SourceBreakdown {
  source: string;
  count: number;
  percentage: number;
}

export interface FunnelData {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  converted: number;
}

export interface ChannelMetrics {
  channel: string;
  sent: number;
  engagementRate: number;
  conversionRate: number;
  cost: number;
  roi: number;
}

export interface ROISummary {
  totalSpent: number;
  totalRevenue: number;
  netProfit: number;
  roi: number;
  costPerAcquisition: number;
}

export interface TemplateSummary {
  id: string;
  name: string;
  channel: string;
  sent: number;
  conversionRate: number;
  rating: number;
}

export interface TierBreakdown {
  [PriorityTier.PLATINUM]: number;
  [PriorityTier.GOLD]: number;
  [PriorityTier.SILVER]: number;
  [PriorityTier.BRONZE]: number;
  [PriorityTier.STANDARD]: number;
}

export interface ProvinceBreakdown {
  [province: string]: number;
}

export interface IndustryBreakdown {
  [industry: string]: number;
}

export interface BusinessSummary {
  id: string;
  name: string;
  type: string;
  tier: string;
  discoveredAt: Date;
  confidence: number;
}

export class PerformanceDashboard extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly analytics: AnalyticsEngine;
  private readonly config: DashboardConfig;
  private refreshTimer?: NodeJS.Timeout;
  private cachedData?: DashboardData;
  private lastUpdate: Date;

  constructor(
    redis: Redis,
    analytics: AnalyticsEngine,
    config?: Partial<DashboardConfig>
  ) {
    super();
    this.logger = createLogger('performance-dashboard');
    this.redis = redis;
    this.analytics = analytics;
    this.lastUpdate = new Date();

    this.config = {
      refreshInterval: 30000, // 30 seconds
      enableRealTime: true,
      enableAlerts: true,
      retentionDays: 30,
      ...config
    };

    if (this.config.enableRealTime) {
      this.startAutoRefresh();
    }

    this.setupEventListeners();
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(useCache: boolean = true): Promise<DashboardData> {
    if (useCache && this.cachedData && this.isCacheValid()) {
      return this.cachedData;
    }

    const startTime = Date.now();
    this.logger.debug('Fetching dashboard data');

    try {
      const [
        overview,
        hunters,
        outreach,
        businesses,
        alerts,
        insights
      ] = await Promise.all([
        this.getSystemOverview(),
        this.getHuntersDashboard(),
        this.getOutreachDashboard(),
        this.getBusinessesDashboard(),
        this.getActiveAlerts(),
        this.generateInsights()
      ]);

      const dashboardData: DashboardData = {
        overview,
        hunters,
        outreach,
        businesses,
        alerts,
        insights
      };

      this.cachedData = dashboardData;
      this.lastUpdate = new Date();

      this.logger.info('Dashboard data fetched', {
        duration: Date.now() - startTime,
        alerts: alerts.length,
        insights: insights.length
      });

      this.emit('dashboard:updated', dashboardData);

      return dashboardData;

    } catch (error) {
      this.logger.error('Failed to fetch dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get system overview
   */
  private async getSystemOverview(): Promise<SystemOverview> {
    const metrics = await this.analytics.getDashboardMetrics();
    const systemMetrics = await this.analytics.getSystemMetrics();

    const status = this.determineSystemStatus(metrics, systemMetrics);
    
    return {
      status,
      uptime: this.formatUptime(metrics.system.uptime),
      discoveryRate: metrics.hunters.discoveryRate,
      conversionRate: metrics.outreach.conversionRate,
      totalBusinesses: systemMetrics.businesses.totalBusinesses,
      totalCampaigns: systemMetrics.outreach.activeCampaigns,
      activeHunters: metrics.hunters.active,
      queueDepth: systemMetrics.performance.queueDepth,
      lastUpdated: new Date()
    };
  }

  /**
   * Get hunters dashboard
   */
  private async getHuntersDashboard(): Promise<HuntersDashboard> {
    const period: AnalyticsPeriod = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours
      end: new Date(),
      granularity: 'hour'
    };

    const systemMetrics = await this.analytics.getSystemMetrics(period);
    const discoveryTrend = await this.getDiscoveryTrend(period);
    const sourceBreakdown = await this.getSourceBreakdown();

    const topPerformers = systemMetrics.hunters.topPerformers.slice(0, 5).map(hp => ({
      id: hp.hunterId,
      type: hp.hunterType,
      discovered: hp.metrics.businessesDiscovered,
      successRate: 1 - hp.metrics.errorRate,
      status: 'active' as const
    }));

    return {
      activeCount: systemMetrics.hunters.totalActive,
      totalDiscovered: systemMetrics.hunters.totalDiscovered,
      discoveryTrend,
      topPerformers,
      errorRate: systemMetrics.hunters.errorRate,
      avgResponseTime: systemMetrics.hunters.avgResponseTime,
      sourceBreakdown
    };
  }

  /**
   * Get outreach dashboard
   */
  private async getOutreachDashboard(): Promise<OutreachDashboard> {
    const period: AnalyticsPeriod = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
      end: new Date(),
      granularity: 'day'
    };

    const systemMetrics = await this.analytics.getSystemMetrics(period);
    const outreach = systemMetrics.outreach;

    const funnel: FunnelData = {
      sent: outreach.totalSent,
      delivered: Math.round(outreach.totalSent * outreach.deliveryRate),
      opened: Math.round(outreach.totalSent * outreach.deliveryRate * 0.3), // Estimate
      clicked: Math.round(outreach.totalSent * outreach.deliveryRate * 0.1),
      responded: Math.round(outreach.totalSent * outreach.deliveryRate * 0.05),
      converted: Math.round(outreach.totalSent * outreach.conversionRate)
    };

    const channelPerformance = outreach.channelPerformance.map(cp => ({
      channel: cp.channel,
      sent: cp.sent,
      engagementRate: cp.engaged / cp.delivered,
      conversionRate: cp.converted / cp.sent,
      cost: cp.cost,
      roi: cp.roi
    }));

    const roi: ROISummary = {
      totalSpent: systemMetrics.costs.totalCost,
      totalRevenue: funnel.converted * 5000, // Estimate $5k per conversion
      netProfit: (funnel.converted * 5000) - systemMetrics.costs.totalCost,
      roi: systemMetrics.costs.totalCost > 0 
        ? ((funnel.converted * 5000 - systemMetrics.costs.totalCost) / systemMetrics.costs.totalCost) * 100
        : 0,
      costPerAcquisition: systemMetrics.costs.costPerConversion
    };

    const topTemplates = await this.getTopTemplates();

    return {
      activeCampaigns: outreach.activeCampaigns,
      totalSent: outreach.totalSent,
      engagementRate: outreach.engagementRate,
      conversionFunnel: funnel,
      channelPerformance,
      roi,
      topTemplates
    };
  }

  /**
   * Get businesses dashboard
   */
  private async getBusinessesDashboard(): Promise<BusinessesDashboard> {
    const systemMetrics = await this.analytics.getSystemMetrics();
    const businesses = systemMetrics.businesses;

    const recentlyDiscovered = await this.getRecentBusinesses(10);

    const byProvince: ProvinceBreakdown = businesses.geographicDistribution;
    const byIndustry: IndustryBreakdown = businesses.industryDistribution;

    return {
      total: businesses.totalBusinesses,
      byTier: businesses.tierDistribution as TierBreakdown,
      byProvince,
      byIndustry,
      recentlyDiscovered,
      verificationRate: businesses.verifiedBusinesses / businesses.totalBusinesses,
      indigenousCount: businesses.indigenousBusinesses
    };
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Get system alerts
    const systemAlerts = await this.redis.keys('alert:active:*');
    
    for (const key of systemAlerts) {
      const alertData = await this.redis.get(key);
      if (alertData) {
        const alert = JSON.parse(alertData);
        alerts.push({
          id: alert.id,
          type: alert.severity === 'critical' ? 'error' : alert.severity,
          title: this.getAlertTitle(alert.type),
          message: this.getAlertMessage(alert),
          timestamp: new Date(alert.createdAt),
          source: alert.source || 'system',
          actions: this.getAlertActions(alert.type)
        });
      }
    }

    // Sort by timestamp descending
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return alerts.slice(0, 20); // Limit to 20 most recent
  }

  /**
   * Generate insights
   */
  private async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];
    const systemMetrics = await this.analytics.getSystemMetrics();

    // Discovery trend insight
    if (systemMetrics.hunters.discoveryRate > 100) {
      insights.push({
        id: 'high-discovery-rate',
        type: 'trend',
        title: 'High Discovery Rate',
        description: `Discovering ${Math.round(systemMetrics.hunters.discoveryRate)} businesses per minute`,
        impact: 'high',
        data: { rate: systemMetrics.hunters.discoveryRate }
      });
    }

    // Conversion milestone
    const totalConverted = Math.round(
      systemMetrics.outreach.totalSent * systemMetrics.outreach.conversionRate
    );
    if (totalConverted > 0 && totalConverted % 100 === 0) {
      insights.push({
        id: `conversion-milestone-${totalConverted}`,
        type: 'milestone',
        title: 'Conversion Milestone',
        description: `Reached ${totalConverted} total conversions!`,
        impact: 'high',
        data: { count: totalConverted }
      });
    }

    // Cost optimization recommendation
    if (systemMetrics.costs.costPerConversion > 100) {
      insights.push({
        id: 'high-cpa',
        type: 'recommendation',
        title: 'High Cost Per Acquisition',
        description: `CPA is $${systemMetrics.costs.costPerConversion.toFixed(2)}. Consider optimizing targeting.`,
        impact: 'medium',
        data: { cpa: systemMetrics.costs.costPerConversion }
      });
    }

    // Anomaly detection
    if (systemMetrics.hunters.errorRate > 0.1) {
      insights.push({
        id: 'high-error-rate',
        type: 'anomaly',
        title: 'Elevated Error Rate',
        description: `Hunter error rate is ${(systemMetrics.hunters.errorRate * 100).toFixed(1)}%`,
        impact: 'high',
        data: { errorRate: systemMetrics.hunters.errorRate }
      });
    }

    // Geographic opportunity
    const topProvince = Object.entries(systemMetrics.businesses.geographicDistribution)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topProvince) {
      insights.push({
        id: 'geographic-concentration',
        type: 'trend',
        title: 'Geographic Concentration',
        description: `${topProvince[1]} businesses found in ${topProvince[0]}`,
        impact: 'low',
        data: { province: topProvince[0], count: topProvince[1] }
      });
    }

    return insights;
  }

  /**
   * Helper methods
   */
  private determineSystemStatus(metrics: any, systemMetrics: SystemMetrics): 'healthy' | 'degraded' | 'critical' {
    if (systemMetrics.hunters.errorRate > 0.2) return 'critical';
    if (systemMetrics.performance.errorRate > 0.1) return 'degraded';
    if (systemMetrics.performance.queueDepth > 1000) return 'degraded';
    if (metrics.system.alerts > 5) return 'degraded';
    return 'healthy';
  }

  private formatUptime(days: number): string {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours}h`;
    }
    return `${days.toFixed(1)}d`;
  }

  private async getDiscoveryTrend(period: AnalyticsPeriod): Promise<TrendData[]> {
    const trend: TrendData[] = [];
    const hours = Math.ceil((period.end.getTime() - period.start.getTime()) / (60 * 60 * 1000));
    
    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(period.start.getTime() + i * 60 * 60 * 1000);
      const value = Math.floor(Math.random() * 50 + 50); // Placeholder
      trend.push({ timestamp, value });
    }
    
    return trend;
  }

  private async getSourceBreakdown(): Promise<SourceBreakdown[]> {
    const sources = [
      { source: 'LinkedIn', count: 450, percentage: 35 },
      { source: 'Government', count: 320, percentage: 25 },
      { source: 'Twitter', count: 260, percentage: 20 },
      { source: 'Instagram', count: 180, percentage: 14 },
      { source: 'TikTok', count: 80, percentage: 6 }
    ];
    
    return sources;
  }

  private async getTopTemplates(): Promise<TemplateSummary[]> {
    return [
      {
        id: 'template-1',
        name: 'Partnership Opportunity',
        channel: 'email',
        sent: 1500,
        conversionRate: 0.05,
        rating: 4.5
      },
      {
        id: 'template-2',
        name: 'Government Contract Alert',
        channel: 'email',
        sent: 1200,
        conversionRate: 0.08,
        rating: 4.8
      },
      {
        id: 'template-3',
        name: 'Quick Introduction',
        channel: 'sms',
        sent: 800,
        conversionRate: 0.03,
        rating: 4.0
      }
    ];
  }

  private async getRecentBusinesses(limit: number): Promise<BusinessSummary[]> {
    const pattern = 'business:discovered:*';
    const keys = await this.redis.keys(pattern);
    const recent: BusinessSummary[] = [];
    
    // Get last N businesses
    for (const key of keys.slice(-limit)) {
      const data = await this.redis.get(key);
      if (data) {
        const business = JSON.parse(data);
        recent.push({
          id: business.id,
          name: business.name,
          type: business.type,
          tier: business.tier || 'standard',
          discoveredAt: new Date(business.discoveredAt),
          confidence: business.confidence
        });
      }
    }
    
    return recent.reverse();
  }

  private getAlertTitle(type: string): string {
    const titles: Record<string, string> = {
      'hunter_underperforming': 'Hunter Performance Alert',
      'hunter_errors': 'Hunter Error Alert',
      'high_queue_depth': 'Queue Backlog Alert',
      'api_rate_limit': 'API Rate Limit Warning',
      'cost_threshold': 'Cost Threshold Exceeded',
      'low_conversion': 'Low Conversion Rate',
      'system_error': 'System Error'
    };
    
    return titles[type] || 'System Alert';
  }

  private getAlertMessage(alert: any): string {
    // Generate contextual message based on alert data
    if (alert.type === 'hunter_underperforming') {
      return `Hunter ${alert.hunterId} discovery rate dropped to ${alert.currentRate}/min`;
    }
    if (alert.type === 'hunter_errors') {
      return `Hunter ${alert.hunterId} encountered ${alert.errors} errors`;
    }
    
    return alert.message || 'Check system logs for details';
  }

  private getAlertActions(type: string): string[] {
    const actions: Record<string, string[]> = {
      'hunter_underperforming': ['Check hunter configuration', 'Review API limits'],
      'hunter_errors': ['Check error logs', 'Restart hunter', 'Verify credentials'],
      'high_queue_depth': ['Scale up workers', 'Check processing bottlenecks'],
      'api_rate_limit': ['Reduce request rate', 'Upgrade API plan'],
      'cost_threshold': ['Review spending', 'Optimize campaigns'],
      'low_conversion': ['Review targeting', 'A/B test templates'],
      'system_error': ['Check system logs', 'Contact support']
    };
    
    return actions[type] || ['Investigate issue'];
  }

  private isCacheValid(): boolean {
    const cacheAge = Date.now() - this.lastUpdate.getTime();
    return cacheAge < this.config.refreshInterval;
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.getDashboardData(false).catch(error => {
        this.logger.error('Auto-refresh failed:', error);
      });
    }, this.config.refreshInterval);
  }

  private setupEventListeners(): void {
    // Listen for real-time updates
    this.analytics.on('metrics:hunter', (data) => {
      this.emit('realtime:hunter', data);
    });

    this.analytics.on('metrics:outreach', (data) => {
      this.emit('realtime:outreach', data);
    });

    this.analytics.on('metrics:business', (data) => {
      this.emit('realtime:business', data);
    });

    this.analytics.on('alert:created', (alert) => {
      this.emit('realtime:alert', alert);
    });
  }

  /**
   * Export dashboard data
   */
  async exportDashboard(format: 'json' | 'csv' | 'pdf'): Promise<Buffer> {
    const data = await this.getDashboardData();
    
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      
      case 'csv':
        // Convert to CSV format
        return this.convertToCSV(data);
      
      case 'pdf':
        // Generate PDF report
        return this.generatePDFReport(data);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private convertToCSV(data: DashboardData): Buffer {
    // Placeholder CSV conversion
    const csv = 'metric,value\n' +
      `total_businesses,${data.businesses.total}\n` +
      `active_hunters,${data.hunters.activeCount}\n` +
      `total_sent,${data.outreach.totalSent}\n`;
    
    return Buffer.from(csv);
  }

  private generatePDFReport(data: DashboardData): Buffer {
    // Placeholder PDF generation
    return Buffer.from('PDF Report - Not implemented');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.removeAllListeners();
  }
}