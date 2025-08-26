/**
 * Performance Monitoring Service Tests
 * SOC 2 Type II Compliance Testing
 */

import { PerformanceMonitoringService, performanceMonitoring } from '../services/PerformanceMonitoringService';
import { EventEmitter } from 'events';
import * as os from 'os';

// Mock dependencies
jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../services/AuditLogger', () => ({
  auditLogger: {
    logEvent: jest.fn()
  }
}));

jest.mock('../services/RedisEncryptionService', () => ({
  redisEncryption: {
    getEncrypted: jest.fn(),
    setEncrypted: jest.fn()
  }
}));

jest.mock('prom-client', () => ({
  Histogram: jest.fn(() => ({
    observe: jest.fn()
  })),
  Counter: jest.fn(() => ({
    inc: jest.fn()
  })),
  Gauge: jest.fn(() => ({
    set: jest.fn()
  })),
  register: {
    registerMetric: jest.fn(),
    metrics: jest.fn().mockResolvedValue('prometheus metrics')
  },
  collectDefaultMetrics: jest.fn()
}));

describe('PerformanceMonitoringService', () => {
  const mockLogger = require('@/lib/monitoring/logger').logger;
  const mockAuditLogger = require('../services/AuditLogger').auditLogger;
  const mockRedis = require('../services/RedisEncryptionService').redisEncryption;
  
  let service: PerformanceMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset singleton
    (PerformanceMonitoringService as any).instance = undefined;
    service = PerformanceMonitoringService.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitoringService.getInstance();
      const instance2 = PerformanceMonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should extend EventEmitter', () => {
      expect(service).toBeInstanceOf(EventEmitter);
    });
  });

  describe('startMetric / endMetric', () => {
    it('should track metric lifecycle', () => {
      const metricId = service.startMetric('api_latency', 'test_operation', { test: 'data' });
      
      expect(metricId).toMatch(/^api_latency_\d+_[a-z0-9]+$/);
      
      // Check metric is in progress
      const inProgress = (service as any).metrics.get('in_progress');
      expect(inProgress).toHaveLength(1);
      expect(inProgress[0].id).toBe(metricId);
      
      // End metric
      service.endMetric(metricId, 'success');
      
      // Check metric moved to completed
      const completed = (service as any).metrics.get('api_latency');
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('success');
    });

    it('should calculate duration correctly', () => {
      const startTime = performance.now();
      const metricId = service.startMetric('database_query', 'select_users');
      
      // Simulate time passing
      jest.advanceTimersByTime(150);
      
      service.endMetric(metricId, 'success');
      
      const metrics = (service as any).metrics.get('database_query');
      expect(metrics[0].duration).toBeGreaterThanOrEqual(100);
    });

    it('should handle metric not found', () => {
      service.endMetric('invalid-metric-id');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Metric not found',
        { metricId: 'invalid-metric-id' }
      );
    });

    it('should check thresholds and emit events', () => {
      const emitSpy = jest.spyOn(service, 'emit');
      const metricId = service.startMetric('api_latency', 'slow_operation');
      
      // Mock slow operation
      const metric = (service as any).metrics.get('in_progress')[0];
      metric.duration = 3000; // 3 seconds - exceeds critical threshold
      
      service.endMetric(metricId, 'success');
      
      expect(emitSpy).toHaveBeenCalledWith('threshold-exceeded', expect.objectContaining({
        level: 'critical',
        threshold: 2000
      }));
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Performance threshold exceeded',
        expect.any(Object)
      );
    });

    it('should maintain metrics size limit', () => {
      const MAX_METRICS = (service as any).MAX_METRICS_PER_TYPE;
      
      // Add more than max metrics
      for (let i = 0; i < MAX_METRICS + 10; i++) {
        const metricId = service.startMetric('api_latency', `operation_${i}`);
        service.endMetric(metricId, 'success');
      }
      
      const metrics = (service as any).metrics.get('api_latency');
      expect(metrics.length).toBe(MAX_METRICS);
    });
  });

  describe('trackOperation', () => {
    it('should track async operations', async () => {
      const result = await service.trackOperation(
        'bank_api_call',
        'test_api',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { data: 'success' };
        },
        { bank: 'scotia' }
      );
      
      expect(result).toEqual({ data: 'success' });
      
      const metrics = (service as any).metrics.get('bank_api_call');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].status).toBe('success');
    });

    it('should track operation failures', async () => {
      await expect(
        service.trackOperation(
          'database_query',
          'failing_query',
          async () => {
            throw new Error('Database error');
          }
        )
      ).rejects.toThrow('Database error');
      
      const metrics = (service as any).metrics.get('database_query');
      expect(metrics[0].status).toBe('failure');
      expect(metrics[0].error).toBe('Database error');
    });
  });

  describe('getHealthMetrics', () => {
    it('should return comprehensive health metrics', async () => {
      // Mock OS metrics
      jest.spyOn(os, 'loadavg').mockReturnValue([1.5, 1.2, 0.9]);
      jest.spyOn(os, 'totalmem').mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
      jest.spyOn(os, 'freemem').mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
      
      // Add some test metrics
      const metricId1 = service.startMetric('api_latency', 'test1');
      service.endMetric(metricId1, 'success');
      
      const metricId2 = service.startMetric('api_latency', 'test2');
      service.endMetric(metricId2, 'failure', 'Error');
      
      const health = await service.getHealthMetrics();
      
      expect(health).toMatchObject({
        timestamp: expect.any(Date),
        cpu: {
          usage: expect.any(Number),
          loadAverage: [1.5, 1.2, 0.9]
        },
        memory: {
          used: 8 * 1024 * 1024 * 1024,
          free: 8 * 1024 * 1024 * 1024,
          total: 16 * 1024 * 1024 * 1024,
          percentUsed: 50
        },
        latency: {
          p50: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number),
          average: expect.any(Number)
        },
        throughput: {
          requestsPerSecond: expect.any(Number),
          bytesPerSecond: expect.any(Number)
        },
        errors: {
          rate: 50, // 1 failure out of 2
          count: 1
        },
        services: expect.any(Object)
      });
      
      // Should cache result
      expect(mockRedis.setEncrypted).toHaveBeenCalledWith(
        'health:current',
        health,
        60
      );
    });

    it('should check SLA compliance', async () => {
      const emitSpy = jest.spyOn(service, 'emit');
      
      // Add metrics that violate SLA
      for (let i = 0; i < 100; i++) {
        const metricId = service.startMetric('api_latency', `operation_${i}`);
        const metric = (service as any).metrics.get('in_progress')[0];
        metric.duration = i < 5 ? 5000 : 100; // 5% have high latency
        service.endMetric(metricId, i < 2 ? 'failure' : 'success');
      }
      
      await service.getHealthMetrics();
      
      expect(emitSpy).toHaveBeenCalledWith(
        'sla-violation',
        expect.objectContaining({
          violations: expect.any(Array)
        })
      );
    });
  });

  describe('getPerformanceReport', () => {
    it('should generate performance report for time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      
      // Add test metrics
      for (let i = 0; i < 10; i++) {
        const metricId = service.startMetric('api_latency', `operation_${i}`);
        const metric = (service as any).metrics.get('in_progress')[0];
        metric.startTime = now.getTime() - (i * 60000); // Spread over last 10 minutes
        metric.duration = 100 + (i * 10);
        service.endMetric(metricId, i === 0 ? 'failure' : 'success');
      }
      
      const report = await service.getPerformanceReport(oneHourAgo, now);
      
      expect(report).toMatchObject({
        period: { start: oneHourAgo, end: now },
        summary: {
          totalOperations: expect.any(Number),
          overallSuccessRate: expect.any(String),
          avgResponseTime: expect.any(String),
          peakLoad: expect.any(Object)
        },
        details: {
          api_latency: {
            count: 10,
            successRate: '90.00%',
            avgDuration: expect.any(String),
            minDuration: expect.any(String),
            maxDuration: expect.any(String),
            p50: expect.any(String),
            p95: expect.any(String),
            p99: expect.any(String),
            failures: 1
          }
        },
        slaCompliance: expect.any(Object),
        recommendations: expect.any(Array)
      });
      
      expect(mockAuditLogger.logEvent).toHaveBeenCalledWith({
        eventType: 'compliance_check',
        action: 'generate_performance_report',
        metadata: expect.any(Object)
      });
    });

    it('should generate recommendations based on thresholds', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      
      // Add slow metrics
      for (let i = 0; i < 5; i++) {
        const metricId = service.startMetric('bank_api_call', `slow_${i}`);
        const metric = (service as any).metrics.get('in_progress')[0];
        metric.duration = 6000; // Exceeds critical threshold
        service.endMetric(metricId, 'success');
      }
      
      const report = await service.getPerformanceReport(oneHourAgo, now);
      
      expect(report.recommendations).toContain(
        expect.stringContaining('Critical: bank_api_call P99 latency')
      );
    });
  });

  describe('getMetricsStream', () => {
    it('should provide real-time metrics stream', async () => {
      const stream = service.getMetricsStream();
      const chunks: string[] = [];
      
      stream.on('data', (chunk) => {
        chunks.push(chunk.toString());
      });
      
      // Wait for first metric
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      
      expect(chunks.length).toBeGreaterThan(0);
      const metric = JSON.parse(chunks[0].trim());
      expect(metric).toMatchObject({
        type: 'health',
        timestamp: expect.any(String),
        data: expect.any(Object)
      });
      
      stream.destroy();
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should export metrics in Prometheus format', async () => {
      const metrics = await service.getPrometheusMetrics();
      expect(metrics).toBe('prometheus metrics');
    });
  });

  describe('setThreshold', () => {
    it('should update performance thresholds', () => {
      service.setThreshold('api_latency', 1000, 3000);
      
      const thresholds = (service as any).THRESHOLDS;
      expect(thresholds.api_latency).toEqual({
        warning: 1000,
        critical: 3000
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance threshold updated',
        expect.any(Object)
      );
    });
  });

  describe('getCurrentAlerts', () => {
    it('should detect CPU alerts', async () => {
      jest.spyOn(os, 'loadavg').mockReturnValue([10, 8, 6]);
      jest.spyOn(os, 'cpus').mockReturnValue(new Array(4)); // 4 cores
      
      const alerts = await service.getCurrentAlerts();
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'cpu',
          severity: 'warning',
          message: expect.stringContaining('High CPU load')
        })
      );
    });

    it('should detect memory alerts', async () => {
      jest.spyOn(os, 'totalmem').mockReturnValue(16 * 1024 * 1024 * 1024);
      jest.spyOn(os, 'freemem').mockReturnValue(1 * 1024 * 1024 * 1024); // 93.75% used
      
      const alerts = await service.getCurrentAlerts();
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'memory',
          severity: 'warning',
          message: expect.stringContaining('High memory usage')
        })
      );
    });

    it('should detect service health alerts', async () => {
      // Mock unhealthy Redis
      mockRedis.setEncrypted.mockRejectedValueOnce(new Error('Redis error'));
      
      const alerts = await service.getCurrentAlerts();
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'service_health',
          severity: 'critical',
          service: 'redis'
        })
      );
    });
  });

  describe('Metrics Collection', () => {
    it('should collect metrics periodically', async () => {
      // Trigger collection interval
      jest.advanceTimersByTime(60000); // 1 minute
      await Promise.resolve();
      
      expect(mockRedis.setEncrypted).toHaveBeenCalledWith(
        expect.stringMatching(/^health:/),
        expect.any(Array),
        86400
      );
    });

    it('should maintain 24-hour retention', async () => {
      // Add old metrics
      const historical = [];
      for (let i = 0; i < 50; i++) {
        historical.push({
          timestamp: new Date(Date.now() - (i * 3600000)) // Each hour back
        });
      }
      
      mockRedis.getEncrypted.mockResolvedValue(historical);
      
      // Trigger collection
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
      
      // Check that old metrics were filtered
      const savedData = mockRedis.setEncrypted.mock.calls[0][1];
      expect(savedData.length).toBeLessThan(25); // Less than 25 hours
    });
  });

  describe('Helper Methods', () => {
    it('should calculate percentiles correctly', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      const p50 = (service as any).percentile(values, 50);
      const p95 = (service as any).percentile(values, 95);
      const p99 = (service as any).percentile(values, 99);
      
      expect(p50).toBe(50);
      expect(p95).toBe(100);
      expect(p99).toBe(100);
    });

    it('should calculate average correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const avg = (service as any).average(values);
      expect(avg).toBe(30);
    });

    it('should handle empty arrays', () => {
      const emptyPercentile = (service as any).percentile([], 50);
      const emptyAverage = (service as any).average([]);
      
      expect(emptyPercentile).toBe(0);
      expect(emptyAverage).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old metrics periodically', () => {
      // Add old metrics
      const oldMetric = {
        id: 'old',
        type: 'api_latency',
        operation: 'old_op',
        startTime: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        endTime: 0,
        duration: 100,
        status: 'success' as const
      };
      
      const newMetric = {
        id: 'new',
        type: 'api_latency',
        operation: 'new_op',
        startTime: Date.now() - (60 * 60 * 1000), // 1 hour ago
        endTime: 0,
        duration: 100,
        status: 'success' as const
      };
      
      const metrics = (service as any).metrics;
      metrics.set('api_latency', [oldMetric, newMetric]);
      
      // Trigger cleanup
      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      
      const remaining = metrics.get('api_latency');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('new');
    });
  });

  describe('Events', () => {
    it('should emit metric-recorded event', () => {
      const listener = jest.fn();
      service.on('metric-recorded', listener);
      
      const metricId = service.startMetric('api_latency', 'test');
      service.endMetric(metricId, 'success');
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api_latency',
          operation: 'test',
          status: 'success'
        })
      );
    });

    it('should emit metrics-collected event', async () => {
      const listener = jest.fn();
      service.on('metrics-collected', listener);
      
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
      
      expect(listener).toHaveBeenCalled();
    });
  });
});