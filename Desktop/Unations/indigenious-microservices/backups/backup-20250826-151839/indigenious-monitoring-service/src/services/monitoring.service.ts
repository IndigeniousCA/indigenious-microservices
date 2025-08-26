import { PrismaClient, Prisma } from '@prisma/client';
import * as promClient from 'prom-client';
import { trace, metrics, context } from '@opentelemetry/api';
import * as os from 'os';
import * as osUtils from 'node-os-utils';
import * as si from 'systeminformation';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import * as nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { differenceInSeconds, format } from 'date-fns';
import axios from 'axios';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const serviceHealthGauge = new promClient.Gauge({
  name: 'service_health_status',
  help: 'Health status of services (1=healthy, 0=unhealthy)',
  labelNames: ['service', 'indigenous']
});

const indigenousMetricsCounter = new promClient.Counter({
  name: 'indigenous_operations_total',
  help: 'Total number of Indigenous-specific operations',
  labelNames: ['operation', 'nation', 'ceremony']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(serviceHealthGauge);
register.registerMetric(indigenousMetricsCounter);

export class MonitoringService extends EventEmitter {
  private services: Map<string, any> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertThresholds: Map<string, any> = new Map();
  private notificationChannels: Map<string, any> = new Map();
  
  // Indigenous monitoring priorities
  private readonly ELDER_ALERT_PRIORITY = 10;
  private readonly CEREMONY_ALERT_PRIORITY = 9;
  private readonly COMMUNITY_ALERT_PRIORITY = 8;
  
  // Logger
  private logger: winston.Logger;
  
  constructor() {
    super();
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'monitoring.log' })
      ]
    });
    
    // Initialize monitoring
    this.initializeMonitoring();
  }
  
  // Initialize monitoring systems
  private async initializeMonitoring() {
    // Load services from database
    await this.loadServices();
    
    // Load notification channels
    await this.loadNotificationChannels();
    
    // Start health checks
    await this.startHealthChecks();
    
    // Start resource monitoring
    this.startResourceMonitoring();
    
    // Initialize alert rules
    await this.initializeAlertRules();
    
    // Start SLA tracking
    this.startSLATracking();
  }
  
  // Load services to monitor
  private async loadServices() {
    const services = await prisma.service.findMany({
      where: { active: true }
    });
    
    for (const service of services) {
      this.services.set(service.serviceName, service);
      
      // Set up health check interval
      this.scheduleHealthCheck(service);
    }
  }
  
  // Schedule health checks
  private scheduleHealthCheck(service: any) {
    const interval = setInterval(async () => {
      await this.performHealthCheck(service);
    }, service.healthCheckInterval);
    
    this.healthCheckIntervals.set(service.serviceName, interval);
  }
  
  // Perform health check
  async performHealthCheck(service: any): Promise<any> {
    const startTime = Date.now();
    let status = 'HEALTHY';
    let error = null;
    let statusCode = null;
    
    try {
      // HTTP health check
      if (service.protocol === 'HTTP' || service.protocol === 'HTTPS') {
        const response = await axios.get(
          `${service.protocol.toLowerCase()}://${service.endpoint}:${service.port}/health`,
          { timeout: service.healthCheckTimeout }
        );
        
        statusCode = response.status;
        
        if (statusCode !== 200) {
          status = 'UNHEALTHY';
        }
      }
      
      // TCP health check
      else if (service.protocol === 'TCP') {
        // TCP connection check
        const net = require('net');
        await new Promise((resolve, reject) => {
          const socket = net.createConnection(service.port, service.endpoint);
          socket.setTimeout(service.healthCheckTimeout);
          
          socket.on('connect', () => {
            socket.end();
            resolve(true);
          });
          
          socket.on('error', reject);
          socket.on('timeout', () => reject(new Error('Connection timeout')));
        });
      }
      
      // Get resource metrics
      const resources = await this.getServiceResources(service);
      
      // Check resource thresholds
      if (resources.cpuUsage > service.cpuThreshold) {
        status = 'DEGRADED';
      }
      
      if (resources.memoryUsage > service.memoryThreshold) {
        status = 'DEGRADED';
      }
      
      // Update service status
      await prisma.service.update({
        where: { id: service.id },
        data: {
          status,
          lastCheckAt: new Date(),
          lastHealthyAt: status === 'HEALTHY' ? new Date() : undefined
        }
      });
      
      // Store health check result
      const healthCheck = await prisma.healthCheck.create({
        data: {
          serviceId: service.id,
          checkType: 'HTTP',
          status: status === 'HEALTHY' ? 'SUCCESS' : 'FAILURE',
          responseTime: Date.now() - startTime,
          statusCode,
          cpuUsage: resources.cpuUsage,
          memoryUsage: resources.memoryUsage,
          diskUsage: resources.diskUsage,
          ceremonyImpact: service.criticalForCeremony && status !== 'HEALTHY',
          error: error?.message
        }
      });
      
      // Update Prometheus metrics
      serviceHealthGauge.set(
        { service: service.serviceName, indigenous: service.indigenousService },
        status === 'HEALTHY' ? 1 : 0
      );
      
      // Check for alerts
      if (status !== 'HEALTHY') {
        await this.checkAlertConditions(service, status, resources);
      }
      
      // Indigenous service special handling
      if (service.indigenousService && status !== 'HEALTHY') {
        await this.handleIndigenousServiceFailure(service);
      }
      
      return healthCheck;
    } catch (error: any) {
      // Service is down
      await this.handleServiceDown(service, error);
      
      return await prisma.healthCheck.create({
        data: {
          serviceId: service.id,
          checkType: 'HTTP',
          status: 'FAILURE',
          responseTime: Date.now() - startTime,
          error: error.message,
          ceremonyImpact: service.criticalForCeremony
        }
      });
    }
  }
  
  // Get service resource metrics
  private async getServiceResources(service: any): Promise<any> {
    try {
      // Get system metrics
      const cpu = await osUtils.cpu.usage();
      const mem = await osUtils.mem.info();
      const disk = await osUtils.drive.info();
      
      return {
        cpuUsage: cpu,
        memoryUsage: 100 - mem.freeMemPercentage,
        diskUsage: parseFloat(disk.usedPercentage),
        networkLatency: await this.measureNetworkLatency(service.endpoint)
      };
    } catch (error) {
      this.logger.error('Failed to get resource metrics', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0
      };
    }
  }
  
  // Create alert
  async createAlert(data: any): Promise<void> {
    const alert = await prisma.alert.create({
      data: {
        alertId: uuidv4(),
        ...data,
        indigenousAlert: data.service?.indigenousService || false,
        elderAlert: data.service?.elderPriority || false,
        ceremonyAlert: data.service?.criticalForCeremony || false
      }
    });
    
    // Send notifications
    await this.sendAlertNotifications(alert);
    
    // Create incident if critical
    if (alert.severity === 'CRITICAL') {
      await this.createIncident(alert);
    }
    
    // Emit alert event
    this.emit('alert', alert);
  }
  
  // Send alert notifications
  private async sendAlertNotifications(alert: any): Promise<void> {
    const channels = await prisma.notificationChannel.findMany({
      where: {
        active: true,
        severityFilter: { has: alert.severity }
      }
    });
    
    for (const channel of channels) {
      try {
        switch (channel.channelType) {
          case 'EMAIL':
            await this.sendEmailAlert(channel, alert);
            break;
          case 'SMS':
            await this.sendSMSAlert(channel, alert);
            break;
          case 'SLACK':
            await this.sendSlackAlert(channel, alert);
            break;
          case 'WEBHOOK':
            await this.sendWebhookAlert(channel, alert);
            break;
          case 'TRADITIONAL':
            await this.sendTraditionalAlert(channel, alert);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send alert via ${channel.channelType}`, error);
      }
    }
  }
  
  // Create incident
  async createIncident(alert: any): Promise<void> {
    const incident = await prisma.incident.create({
      data: {
        incidentId: `INC-${Date.now()}`,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        servicesAffected: [alert.serviceId],
        indigenousImpact: alert.indigenousAlert,
        elderServicesDown: alert.elderAlert,
        ceremoniesAffected: alert.ceremonyAlert ? ['IMPACTED'] : [],
        alerts: {
          connect: { id: alert.id }
        }
      }
    });
    
    // Start incident response
    await this.startIncidentResponse(incident);
    
    // Notify stakeholders
    if (incident.indigenousImpact) {
      await this.notifyIndigenousStakeholders(incident);
    }
  }
  
  // Collect metrics
  async collectMetrics(): Promise<void> {
    try {
      // System metrics
      const cpuInfo = await si.cpu();
      const memInfo = await si.mem();
      const diskInfo = await si.fsSize();
      const networkInfo = await si.networkStats();
      
      // Store system metrics
      for (const disk of diskInfo) {
        await prisma.systemResource.create({
          data: {
            hostname: os.hostname(),
            resourceType: 'DISK',
            totalCapacity: disk.size,
            usedCapacity: disk.used,
            availableCapacity: disk.available,
            utilizationPercent: disk.use
          }
        });
      }
      
      // Memory metrics
      await prisma.systemResource.create({
        data: {
          hostname: os.hostname(),
          resourceType: 'MEMORY',
          totalCapacity: memInfo.total,
          usedCapacity: memInfo.used,
          availableCapacity: memInfo.available,
          utilizationPercent: (memInfo.used / memInfo.total) * 100
        }
      });
      
      // CPU metrics
      const cpuUsage = await osUtils.cpu.usage();
      await prisma.systemResource.create({
        data: {
          hostname: os.hostname(),
          resourceType: 'CPU',
          totalCapacity: 100,
          usedCapacity: cpuUsage,
          availableCapacity: 100 - cpuUsage,
          utilizationPercent: cpuUsage,
          temperature: cpuInfo.temperature?.main
        }
      });
      
      // Service-specific metrics
      for (const [serviceName, service] of this.services) {
        await this.collectServiceMetrics(service);
      }
      
      // Indigenous metrics
      await this.collectIndigenousMetrics();
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
    }
  }
  
  // Collect service metrics
  private async collectServiceMetrics(service: any): Promise<void> {
    try {
      // Get service-specific metrics via API
      const response = await axios.get(
        `${service.protocol.toLowerCase()}://${service.endpoint}:${service.port}/metrics`,
        { timeout: 5000 }
      );
      
      // Parse and store metrics
      if (response.data) {
        await prisma.metric.create({
          data: {
            serviceId: service.id,
            metricName: 'service_requests',
            metricType: 'COUNTER',
            value: response.data.requests || 0,
            unit: 'requests',
            resourceType: 'CUSTOM'
          }
        });
      }
    } catch (error) {
      // Service metrics not available
    }
  }
  
  // Collect Indigenous-specific metrics
  private async collectIndigenousMetrics(): Promise<void> {
    // Count Indigenous service operations
    const indigenousOps = await prisma.healthCheck.count({
      where: {
        ceremonyImpact: true,
        timestamp: { gte: new Date(Date.now() - 3600000) } // Last hour
      }
    });
    
    indigenousMetricsCounter.inc({
      operation: 'health_check',
      nation: 'all',
      ceremony: 'monitoring'
    }, indigenousOps);
    
    // Store Indigenous metrics
    await prisma.metric.create({
      data: {
        metricName: 'indigenous_operations',
        metricType: 'COUNTER',
        value: indigenousOps,
        unit: 'operations',
        resourceType: 'CUSTOM',
        indigenousMetric: true,
        communityMetrics: {
          healthChecks: indigenousOps
        }
      }
    });
  }
  
  // Get dashboard data
  async getDashboardData(dashboardId: string): Promise<any> {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId }
    });
    
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }
    
    const data: any = {
      dashboard,
      widgets: []
    };
    
    // Process each widget
    for (const widget of dashboard.widgets as any[]) {
      const widgetData = await this.getWidgetData(widget);
      data.widgets.push(widgetData);
    }
    
    // Apply Indigenous customizations
    if (dashboard.indigenousDashboard) {
      data.culturalElements = await this.getCulturalDashboardElements();
    }
    
    if (dashboard.elderView) {
      data = this.simplifyForElders(data);
    }
    
    return data;
  }
  
  // Start incident response
  private async startIncidentResponse(incident: any): Promise<void> {
    // Auto-assign incident commander
    const commander = await this.assignIncidentCommander(incident);
    
    // Assemble response team
    const team = await this.assembleResponseTeam(incident);
    
    // Start remediation
    if (incident.severity === 'CRITICAL') {
      await this.startAutoRemediation(incident);
    }
    
    // Update incident
    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        incidentCommander: commander,
        responseTeam: team,
        acknowledgedAt: new Date()
      }
    });
  }
  
  // Handle Indigenous service failure
  private async handleIndigenousServiceFailure(service: any): Promise<void> {
    // Notify Elders if Elder priority service
    if (service.elderPriority) {
      await this.notifyElders(service, 'SERVICE_DOWN');
    }
    
    // Check ceremony impact
    if (service.criticalForCeremony) {
      await this.assessCeremonyImpact(service);
    }
    
    // Notify community if essential
    if (service.communityEssential) {
      await this.notifyCommunity(service, 'SERVICE_DEGRADED');
    }
  }
  
  // Helper methods
  private async handleServiceDown(service: any, error: Error): Promise<void> {
    await prisma.service.update({
      where: { id: service.id },
      data: { status: 'UNHEALTHY' }
    });
    
    await this.createAlert({
      serviceId: service.id,
      alertName: `${service.serviceName} Down`,
      severity: service.criticalForCeremony ? 'CRITICAL' : 'HIGH',
      title: `Service ${service.serviceName} is down`,
      description: error.message
    });
  }
  
  private async checkAlertConditions(service: any, status: string, resources: any): Promise<void> {
    const rules = await prisma.alertRule.findMany({
      where: { active: true }
    });
    
    for (const rule of rules) {
      const shouldAlert = await this.evaluateAlertRule(rule, service, resources);
      
      if (shouldAlert) {
        await this.createAlert({
          serviceId: service.id,
          alertName: rule.ruleName,
          severity: rule.severity,
          title: `Alert: ${rule.ruleName}`,
          description: rule.description || 'Alert condition met',
          threshold: rule.threshold,
          actualValue: resources[rule.metricName]
        });
      }
    }
  }
  
  private async evaluateAlertRule(rule: any, service: any, metrics: any): Promise<boolean> {
    const value = metrics[rule.metricName];
    if (!value) return false;
    
    switch (rule.condition) {
      case 'GREATER_THAN':
        return value > rule.threshold;
      case 'LESS_THAN':
        return value < rule.threshold;
      case 'EQUALS':
        return value === rule.threshold;
      default:
        return false;
    }
  }
  
  private async measureNetworkLatency(endpoint: string): Promise<number> {
    const start = Date.now();
    try {
      await axios.get(`http://${endpoint}`, { timeout: 1000 });
      return Date.now() - start;
    } catch {
      return -1;
    }
  }
  
  private async loadNotificationChannels(): Promise<void> {
    const channels = await prisma.notificationChannel.findMany({
      where: { active: true }
    });
    
    for (const channel of channels) {
      this.notificationChannels.set(channel.channelName, channel);
    }
  }
  
  private async initializeAlertRules(): Promise<void> {
    const rules = await prisma.alertRule.findMany({
      where: { active: true }
    });
    
    for (const rule of rules) {
      this.alertThresholds.set(rule.ruleName, rule);
    }
  }
  
  private startResourceMonitoring(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }
  
  private startSLATracking(): void {
    setInterval(async () => {
      await this.calculateSLACompliance();
    }, 3600000); // Every hour
  }
  
  private async calculateSLACompliance(): Promise<void> {
    const slas = await prisma.sLA.findMany({
      where: { active: true }
    });
    
    for (const sla of slas) {
      await this.generateSLAReport(sla);
    }
  }
  
  private async generateSLAReport(sla: any): Promise<void> {
    // Calculate SLA metrics for the period
    // Implementation would calculate actual uptime, response times, etc.
  }
  
  private async sendEmailAlert(channel: any, alert: any): Promise<void> {
    const transporter = nodemailer.createTransport(channel.configuration);
    
    await transporter.sendMail({
      from: 'monitoring@indigenous.ca',
      to: channel.recipients,
      subject: `[${alert.severity}] ${alert.title}`,
      text: alert.description,
      html: `<b>${alert.title}</b><br>${alert.description}`
    });
  }
  
  private async sendSMSAlert(channel: any, alert: any): Promise<void> {
    // SMS implementation using Twilio or similar
  }
  
  private async sendSlackAlert(channel: any, alert: any): Promise<void> {
    const slack = new WebClient(channel.configuration.token);
    
    await slack.chat.postMessage({
      channel: channel.configuration.channel,
      text: `🚨 ${alert.title}`,
      attachments: [{
        color: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Service', value: alert.service?.serviceName || 'N/A', short: true },
          { title: 'Description', value: alert.description }
        ]
      }]
    });
  }
  
  private async sendWebhookAlert(channel: any, alert: any): Promise<void> {
    await axios.post(channel.configuration.url, alert);
  }
  
  private async sendTraditionalAlert(channel: any, alert: any): Promise<void> {
    // Symbolic traditional alert (would integrate with community systems)
    this.logger.info(`Traditional alert sent: ${channel.traditionalMethod}`);
  }
  
  private async notifyElders(service: any, type: string): Promise<void> {
    // Send high-priority notifications to Elders
    const elderChannels = await prisma.notificationChannel.findMany({
      where: { elderChannel: true }
    });
    
    for (const channel of elderChannels) {
      await this.sendAlertNotifications({
        title: `Elder Priority: ${service.serviceName} Issue`,
        description: `Service affecting Elder operations requires attention`,
        severity: 'CRITICAL',
        elderAlert: true
      });
    }
  }
  
  private async assessCeremonyImpact(service: any): Promise<void> {
    // Check if ceremony is currently happening or scheduled
    // Would integrate with ceremony calendar service
  }
  
  private async notifyCommunity(service: any, status: string): Promise<void> {
    // Broadcast to community channels
    const communityChannels = await prisma.notificationChannel.findMany({
      where: { communityChannel: true }
    });
    
    for (const channel of communityChannels) {
      await this.sendAlertNotifications({
        title: `Community Service Update: ${service.serviceName}`,
        description: `Essential community service status: ${status}`,
        severity: 'MEDIUM',
        communityWide: true
      });
    }
  }
  
  private async notifyIndigenousStakeholders(incident: any): Promise<void> {
    // Notify relevant Indigenous stakeholders
    if (incident.elderServicesDown) {
      await this.notifyElders({ serviceName: 'Multiple Services' }, 'INCIDENT');
    }
  }
  
  private async assignIncidentCommander(incident: any): Promise<string> {
    // Auto-assign based on severity and type
    return 'auto-assigned-commander';
  }
  
  private async assembleResponseTeam(incident: any): Promise<string[]> {
    // Assemble team based on incident type
    return ['responder-1', 'responder-2'];
  }
  
  private async startAutoRemediation(incident: any): Promise<void> {
    // Attempt automatic remediation for known issues
  }
  
  private async getWidgetData(widget: any): Promise<any> {
    // Get data for dashboard widget
    return widget;
  }
  
  private async getCulturalDashboardElements(): Promise<any> {
    // Get Indigenous cultural elements for dashboard
    return {
      theme: 'medicine-wheel',
      colors: ['yellow', 'red', 'black', 'white']
    };
  }
  
  private simplifyForElders(data: any): any {
    // Simplify dashboard data for Elder view
    return {
      ...data,
      simplified: true,
      largeText: true,
      essentialOnly: true
    };
  }
  
  // Public methods
  public getPrometheusMetrics(): string {
    return register.metrics();
  }
  
  public async getServiceStatus(serviceName: string): Promise<any> {
    return await prisma.service.findUnique({
      where: { serviceName },
      include: {
        healthChecks: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });
  }
  
  public async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await prisma.alert.update({
      where: { alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date()
      }
    });
  }
  
  public async resolveAlert(alertId: string, userId: string): Promise<void> {
    await prisma.alert.update({
      where: { alertId },
      data: {
        status: 'RESOLVED',
        resolvedBy: userId,
        resolvedAt: new Date()
      }
    });
  }
}