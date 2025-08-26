/**
 * Performance Monitoring Service
 * SOC 2 Type II Compliant System Performance Tracking
 * 
 * SOC 2 Controls Addressed:
 * - CC7.2: System performance monitoring
 * - CC7.4: Environmental performance monitoring
 * - A1.1: Capacity planning and monitoring
 * - A1.2: System availability monitoring
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/monitoring/logger';
import { auditLogger } from './AuditLogger';
import { redisEncryption } from './RedisEncryptionService';
import { z } from 'zod';
import * as os from 'os';
import { performance, PerformanceObserver } from 'perf_hooks';
import promClient from 'prom-client';

// Performance metric schemas
const MetricTypeSchema = z.enum([
  'api_latency',
  'database_query',
  'redis_operation',
  'bank_api_call',
  'fraud_check',
  'payment_processing',
  'verification_check',
  'encryption_operation'
]);

const PerformanceMetricSchema = z.object({
  id: z.string(),
  type: MetricTypeSchema,
  operation: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number(),
  status: z.enum(['success', 'failure']),
  metadata: z.record(z.any()).optional(),
  error: z.string().optional()
});

const HealthMetricsSchema = z.object({
  timestamp: z.date(),
  cpu: z.object({
    usage: z.number(),
    loadAverage: z.array(z.number())
  }),
  memory: z.object({
    used: z.number(),
    free: z.number(),
    total: z.number(),
    percentUsed: z.number()
  }),
  latency: z.object({
    p50: z.number(),
    p95: z.number(),
    p99: z.number(),
    average: z.number()
  }),
  throughput: z.object({
    requestsPerSecond: z.number(),
    bytesPerSecond: z.number()
  }),
  errors: z.object({
    rate: z.number(),
    count: z.number()
  }),
  services: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    latency: z.number(),
    errorRate: z.number()
  }))
});

type MetricType = z.infer<typeof MetricTypeSchema>;
type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;
type HealthMetrics = z.infer<typeof HealthMetricsSchema>;

// Prometheus metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'bank_integration_http_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

const dbQueryDuration = new promClient.Histogram({
  name: 'bank_integration_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1]
});

const paymentProcessingDuration = new promClient.Histogram({
  name: 'bank_integration_payment_duration_seconds',
  help: 'Duration of payment processing in seconds',
  labelNames: ['bank', 'payment_type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const errorCounter = new promClient.Counter({
  name: 'bank_integration_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'operation']
});

const activeConnections = new promClient.Gauge({
  name: 'bank_integration_active_connections',
  help: 'Number of active connections',
  labelNames: ['service']
});

export class PerformanceMonitoringService extends EventEmitter {
  private static instance: PerformanceMonitoringService;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly MAX_METRICS_PER_TYPE = 10000;
  private readonly METRIC_RETENTION_HOURS = 24;
  private performanceObserver: PerformanceObserver;
  
  // Thresholds for alerting (milliseconds)
  private readonly THRESHOLDS = {
    api_latency: { warning: 500, critical: 2000 },
    database_query: { warning: 100, critical: 500 },
    redis_operation: { warning: 50, critical: 200 },
    bank_api_call: { warning: 1000, critical: 5000 },
    fraud_check: { warning: 200, critical: 1000 },
    payment_processing: { warning: 2000, critical: 10000 },
    verification_check: { warning: 500, critical: 2000 },
    encryption_operation: { warning: 100, critical: 500 }
  };
  
  // SLA targets
  private readonly SLA_TARGETS = {
    availability: 99.9, // 99.9% uptime
    apiLatencyP99: 1000, // 99th percentile under 1 second
    errorRate: 0.1, // Less than 0.1% error rate
    throughput: 1000 // At least 1000 requests per minute
  };
  
  private constructor() {
    super();
    this.initializePrometheus();
    this.setupPerformanceObserver();
    this.startMetricsCollection();
    this.setupCleanup();
  }
  
  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }
  
  /**
   * Start tracking a performance metric
   * SOC 2 CC7.2: Performance measurement
   */
  startMetric(type: MetricType, operation: string, metadata?: any): string {
    const metricId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      id: metricId,
      type,
      operation,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      status: 'success',
      metadata
    };
    
    // Store in progress
    const inProgress = this.metrics.get('in_progress') || [];
    inProgress.push(metric);
    this.metrics.set('in_progress', inProgress);
    
    return metricId;
  }
  
  /**
   * End tracking a performance metric
   */
  endMetric(metricId: string, status: 'success' | 'failure' = 'success', error?: string): void {
    const inProgress = this.metrics.get('in_progress') || [];
    const metricIndex = inProgress.findIndex(m => m.id === metricId);
    
    if (metricIndex === -1) {
      logger.warn('Metric not found', { metricId });
      return;
    }
    
    const metric = inProgress[metricIndex];
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.status = status;
    metric.error = error;
    
    // Remove from in progress
    inProgress.splice(metricIndex, 1);
    
    // Store in completed metrics
    const typeMetrics = this.metrics.get(metric.type) || [];
    typeMetrics.push(metric);
    
    // Maintain size limit
    if (typeMetrics.length > this.MAX_METRICS_PER_TYPE) {
      typeMetrics.shift(); // Remove oldest
    }
    
    this.metrics.set(metric.type, typeMetrics);
    
    // Update Prometheus metrics
    this.updatePrometheusMetrics(metric);
    
    // Check thresholds
    this.checkThresholds(metric);
    
    // Emit metric event
    this.emit('metric-recorded', metric);
  }
  
  /**
   * Track async operation with automatic timing
   */
  async trackOperation<T>(
    type: MetricType,
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const metricId = this.startMetric(type, operation, metadata);
    
    try {
      const result = await fn();
      this.endMetric(metricId, 'success');
      return result;
    } catch (error) {
      this.endMetric(metricId, 'failure', error.message);
      throw error;
    }
  }
  
  /**
   * Get current health metrics
   * SOC 2 A1.1: System health monitoring
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    const now = new Date();
    
    // Calculate CPU metrics
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    
    // Calculate memory metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Calculate latency percentiles
    const latencyMetrics = this.calculateLatencyPercentiles();
    
    // Calculate throughput
    const throughput = this.calculateThroughput();
    
    // Calculate error rate
    const errorMetrics = this.calculateErrorMetrics();
    
    // Check service health
    const serviceHealth = await this.checkServiceHealth();
    
    const healthMetrics: HealthMetrics = {
      timestamp: now,
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage
      },
      memory: {
        used: usedMemory,
        free: freeMemory,
        total: totalMemory,
        percentUsed: (usedMemory / totalMemory) * 100
      },
      latency: latencyMetrics,
      throughput,
      errors: errorMetrics,
      services: serviceHealth
    };
    
    // Store in cache
    await redisEncryption.setEncrypted('health:current', healthMetrics, 60);
    
    // Check SLA compliance
    this.checkSLACompliance(healthMetrics);
    
    return healthMetrics;
  }
  
  /**
   * Get performance report for a time range
   * SOC 2 CC7.2: Performance reporting
   */
  async getPerformanceReport(
    startTime: Date,
    endTime: Date,
    metricTypes?: MetricType[]
  ): Promise<any> {
    const report = {
      period: { start: startTime, end: endTime },
      summary: {} as any,
      details: {} as any,
      slaCompliance: {} as any,
      recommendations: [] as string[]
    };
    
    // Get metrics for the period
    const typesToAnalyze = metricTypes || Object.values(MetricTypeSchema.enum);
    
    for (const type of typesToAnalyze) {
      const metrics = this.metrics.get(type) || [];
      const periodMetrics = metrics.filter(m => {
        const metricTime = new Date(m.startTime);
        return metricTime >= startTime && metricTime <= endTime;
      });
      
      if (periodMetrics.length === 0) continue;
      
      // Calculate statistics
      const durations = periodMetrics.map(m => m.duration);
      const successCount = periodMetrics.filter(m => m.status === 'success').length;
      const failureCount = periodMetrics.filter(m => m.status === 'failure').length;
      
      report.details[type] = {
        count: periodMetrics.length,
        successRate: (successCount / periodMetrics.length * 100).toFixed(2) + '%',
        avgDuration: this.average(durations).toFixed(2) + 'ms',
        minDuration: Math.min(...durations).toFixed(2) + 'ms',
        maxDuration: Math.max(...durations).toFixed(2) + 'ms',
        p50: this.percentile(durations, 50).toFixed(2) + 'ms',
        p95: this.percentile(durations, 95).toFixed(2) + 'ms',
        p99: this.percentile(durations, 99).toFixed(2) + 'ms',
        failures: failureCount
      };
      
      // Check against thresholds
      const p99Duration = this.percentile(durations, 99);
      if (p99Duration > this.THRESHOLDS[type].critical) {
        report.recommendations.push(
          `Critical: ${type} P99 latency (${p99Duration.toFixed(0)}ms) exceeds threshold (${this.THRESHOLDS[type].critical}ms)`
        );
      } else if (p99Duration > this.THRESHOLDS[type].warning) {
        report.recommendations.push(
          `Warning: ${type} P99 latency (${p99Duration.toFixed(0)}ms) exceeds warning threshold (${this.THRESHOLDS[type].warning}ms)`
        );
      }
    }
    
    // Calculate overall summary
    report.summary = {
      totalOperations: Object.values(report.details).reduce((sum: number, d: any) => sum + d.count, 0),
      overallSuccessRate: this.calculateOverallSuccessRate(report.details),
      avgResponseTime: this.calculateOverallAvgResponseTime(report.details),
      peakLoad: await this.getPeakLoad(startTime, endTime)
    };
    
    // Check SLA compliance
    report.slaCompliance = await this.calculateSLACompliance(startTime, endTime);
    
    // Log report generation
    await auditLogger.logEvent({
      eventType: 'compliance_check',
      action: 'generate_performance_report',
      metadata: {
        period: report.period,
        summary: report.summary
      }
    });
    
    return report;
  }
  
  /**
   * Get real-time metrics stream
   * SOC 2 CC7.2: Real-time monitoring
   */
  getMetricsStream(): NodeJS.ReadableStream {
    const { Readable } = require('stream');
    const stream = new Readable({ read() {} });
    
    const interval = setInterval(async () => {
      try {
        const metrics = await this.getHealthMetrics();
        stream.push(JSON.stringify({
          type: 'health',
          timestamp: new Date().toISOString(),
          data: metrics
        }) + '\n');
      } catch (error) {
        logger.error('Failed to get metrics for stream', { error });
      }
    }, 5000); // Every 5 seconds
    
    stream.on('close', () => {
      clearInterval(interval);
    });
    
    return stream;
  }
  
  /**
   * Export metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    return promClient.register.metrics();
  }
  
  /**
   * Set custom alert threshold
   */
  setThreshold(metricType: MetricType, warning: number, critical: number): void {
    this.THRESHOLDS[metricType] = { warning, critical };
    
    logger.info('Performance threshold updated', {
      metricType,
      warning,
      critical
    });
  }
  
  /**
   * Get current alerts
   */
  async getCurrentAlerts(): Promise<any[]> {
    const alerts = [];
    const healthMetrics = await this.getHealthMetrics();
    
    // CPU alerts
    if (healthMetrics.cpu.loadAverage[0] > os.cpus().length * 0.8) {
      alerts.push({
        type: 'cpu',
        severity: 'warning',
        message: `High CPU load: ${healthMetrics.cpu.loadAverage[0].toFixed(2)}`,
        value: healthMetrics.cpu.loadAverage[0]
      });
    }
    
    // Memory alerts
    if (healthMetrics.memory.percentUsed > 85) {
      alerts.push({
        type: 'memory',
        severity: healthMetrics.memory.percentUsed > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${healthMetrics.memory.percentUsed.toFixed(1)}%`,
        value: healthMetrics.memory.percentUsed
      });
    }
    
    // Error rate alerts
    if (healthMetrics.errors.rate > this.SLA_TARGETS.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate (${healthMetrics.errors.rate.toFixed(2)}%) exceeds SLA target (${this.SLA_TARGETS.errorRate}%)`,
        value: healthMetrics.errors.rate
      });
    }
    
    // Service health alerts
    for (const [service, health] of Object.entries(healthMetrics.services)) {
      if (health.status !== 'healthy') {
        alerts.push({
          type: 'service_health',
          severity: health.status === 'unhealthy' ? 'critical' : 'warning',
          message: `Service ${service} is ${health.status}`,
          service,
          value: health
        });
      }
    }
    
    return alerts;
  }
  
  // Private helper methods
  
  private initializePrometheus(): void {
    // Register all metrics
    promClient.register.registerMetric(httpRequestDuration);
    promClient.register.registerMetric(dbQueryDuration);
    promClient.register.registerMetric(paymentProcessingDuration);
    promClient.register.registerMetric(errorCounter);
    promClient.register.registerMetric(activeConnections);
    
    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ prefix: 'bank_integration_' });
  }
  
  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          logger.debug('Performance measure', {
            name: entry.name,
            duration: entry.duration
          });
        }
      }
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }
  
  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      try {
        const metrics = await this.getHealthMetrics();
        
        // Store historical data
        const historicalKey = `health:${new Date().toISOString().split('T')[0]}`;
        const historical = await redisEncryption.getEncrypted<any[]>(historicalKey) || [];
        historical.push(metrics);
        
        // Keep only last 24 hours
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        const filtered = historical.filter(m => new Date(m.timestamp).getTime() > cutoff);
        
        await redisEncryption.setEncrypted(historicalKey, filtered, 86400); // 24 hour TTL
        
        // Emit metrics event
        this.emit('metrics-collected', metrics);
        
      } catch (error) {
        logger.error('Failed to collect metrics', { error });
      }
    }, 60000); // Every minute
  }
  
  private updatePrometheusMetrics(metric: PerformanceMetric): void {
    const labels: any = {};
    
    switch (metric.type) {
      case 'api_latency':
        labels.method = metric.metadata?.method || 'unknown';
        labels.route = metric.metadata?.route || 'unknown';
        labels.status_code = metric.status === 'success' ? '200' : '500';
        httpRequestDuration.observe(labels, metric.duration / 1000); // Convert to seconds
        break;
        
      case 'database_query':
        labels.operation = metric.operation;
        labels.table = metric.metadata?.table || 'unknown';
        dbQueryDuration.observe(labels, metric.duration / 1000);
        break;
        
      case 'payment_processing':
        labels.bank = metric.metadata?.bank || 'unknown';
        labels.payment_type = metric.metadata?.type || 'unknown';
        labels.status = metric.status;
        paymentProcessingDuration.observe(labels, metric.duration / 1000);
        break;
    }
    
    if (metric.status === 'failure') {
      errorCounter.inc({
        type: metric.type,
        operation: metric.operation
      });
    }
  }
  
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.THRESHOLDS[metric.type];
    
    if (metric.duration > threshold.critical) {
      this.emit('threshold-exceeded', {
        metric,
        level: 'critical',
        threshold: threshold.critical
      });
      
      logger.error('Performance threshold exceeded', {
        type: metric.type,
        operation: metric.operation,
        duration: metric.duration,
        threshold: threshold.critical
      });
    } else if (metric.duration > threshold.warning) {
      this.emit('threshold-exceeded', {
        metric,
        level: 'warning',
        threshold: threshold.warning
      });
    }
  }
  
  private calculateLatencyPercentiles(): any {
    const allDurations: number[] = [];
    
    for (const [type, metrics] of this.metrics) {
      if (type !== 'in_progress') {
        allDurations.push(...metrics.map(m => m.duration));
      }
    }
    
    if (allDurations.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0 };
    }
    
    return {
      p50: this.percentile(allDurations, 50),
      p95: this.percentile(allDurations, 95),
      p99: this.percentile(allDurations, 99),
      average: this.average(allDurations)
    };
  }
  
  private calculateThroughput(): any {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    let requestCount = 0;
    let totalBytes = 0;
    
    for (const [type, metrics] of this.metrics) {
      if (type !== 'in_progress') {
        const recentMetrics = metrics.filter(m => m.startTime > oneMinuteAgo);
        requestCount += recentMetrics.length;
        totalBytes += recentMetrics.reduce((sum, m) => sum + (m.metadata?.bytes || 0), 0);
      }
    }
    
    return {
      requestsPerSecond: requestCount / 60,
      bytesPerSecond: totalBytes / 60
    };
  }
  
  private calculateErrorMetrics(): any {
    let totalCount = 0;
    let errorCount = 0;
    
    for (const [type, metrics] of this.metrics) {
      if (type !== 'in_progress') {
        totalCount += metrics.length;
        errorCount += metrics.filter(m => m.status === 'failure').length;
      }
    }
    
    return {
      rate: totalCount > 0 ? (errorCount / totalCount) * 100 : 0,
      count: errorCount
    };
  }
  
  private async checkServiceHealth(): Promise<any> {
    const services: any = {};
    
    // Check Redis
    try {
      const start = performance.now();
      await redisEncryption.setEncrypted('health:ping', 'pong', 1);
      const latency = performance.now() - start;
      
      services.redis = {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latency,
        errorRate: 0
      };
    } catch (error) {
      services.redis = {
        status: 'unhealthy',
        latency: 0,
        errorRate: 100
      };
    }
    
    // Check database (mock for now)
    services.database = {
      status: 'healthy',
      latency: 50,
      errorRate: 0
    };
    
    // Check fraud detection service
    services.fraudDetection = {
      status: 'healthy',
      latency: 150,
      errorRate: 0.1
    };
    
    return services;
  }
  
  private checkSLACompliance(metrics: HealthMetrics): void {
    const violations = [];
    
    if (metrics.latency.p99 > this.SLA_TARGETS.apiLatencyP99) {
      violations.push(`P99 latency (${metrics.latency.p99.toFixed(0)}ms) exceeds SLA target (${this.SLA_TARGETS.apiLatencyP99}ms)`);
    }
    
    if (metrics.errors.rate > this.SLA_TARGETS.errorRate) {
      violations.push(`Error rate (${metrics.errors.rate.toFixed(2)}%) exceeds SLA target (${this.SLA_TARGETS.errorRate}%)`);
    }
    
    if (violations.length > 0) {
      this.emit('sla-violation', { violations, metrics });
      logger.warn('SLA violations detected', { violations });
    }
  }
  
  private setupCleanup(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      const cutoff = Date.now() - (this.METRIC_RETENTION_HOURS * 60 * 60 * 1000);
      
      for (const [type, metrics] of this.metrics) {
        if (type !== 'in_progress') {
          const filtered = metrics.filter(m => m.startTime > cutoff);
          this.metrics.set(type, filtered);
        }
      }
    }, 60 * 60 * 1000);
  }
  
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private calculateOverallSuccessRate(details: any): string {
    let totalSuccess = 0;
    let totalOperations = 0;
    
    for (const detail of Object.values(details)) {
      const d = detail as any;
      totalOperations += d.count;
      totalSuccess += d.count * (parseFloat(d.successRate) / 100);
    }
    
    return totalOperations > 0 
      ? (totalSuccess / totalOperations * 100).toFixed(2) + '%'
      : '0%';
  }
  
  private calculateOverallAvgResponseTime(details: any): string {
    let totalDuration = 0;
    let totalCount = 0;
    
    for (const detail of Object.values(details)) {
      const d = detail as any;
      totalDuration += parseFloat(d.avgDuration) * d.count;
      totalCount += d.count;
    }
    
    return totalCount > 0 
      ? (totalDuration / totalCount).toFixed(2) + 'ms'
      : '0ms';
  }
  
  private async getPeakLoad(startTime: Date, endTime: Date): Promise<any> {
    // Mock implementation - would analyze historical data
    return {
      timestamp: new Date(),
      requestsPerSecond: 150,
      concurrentUsers: 1200
    };
  }
  
  private async calculateSLACompliance(startTime: Date, endTime: Date): Promise<any> {
    // Mock implementation - would calculate from historical data
    return {
      availability: 99.95,
      avgLatency: 450,
      errorRate: 0.05,
      throughput: 1200,
      compliant: true
    };
  }
}

// Export singleton instance
export const performanceMonitoring = PerformanceMonitoringService.getInstance();