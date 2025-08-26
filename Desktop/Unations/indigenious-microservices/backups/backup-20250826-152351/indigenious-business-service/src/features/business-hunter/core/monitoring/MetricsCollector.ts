import { EventEmitter } from 'events';
import { DashboardStats, DiscoveryMetrics, SystemHealth } from '../../dashboard/types';
import { redis } from '../utils/redis';
import os from 'os';

export class MetricsCollector extends EventEmitter {
  private metricsInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.startCollection();
  }

  private startCollection(): void {
    // Collect metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);
  }

  private async collectSystemMetrics(): Promise<void> {
    const cpuUsage = this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const timestamp = new Date().toISOString();

    await redis.zadd('metrics:cpu', Date.now(), `${timestamp}:${cpuUsage}`);
    await redis.zadd('metrics:memory', Date.now(), `${timestamp}:${memoryUsage}`);

    // Keep only last 24 hours of metrics
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    await redis.zremrangebyscore('metrics:cpu', '-inf', cutoff);
    await redis.zremrangebyscore('metrics:memory', '-inf', cutoff);
  }

  async getStats(): Promise<DashboardStats> {
    const [
      totalDiscovered,
      indigenousIdentified,
      activeHunters,
      discoveryQueue,
      validationQueue,
      enrichmentQueue,
      exportQueue
    ] = await Promise.all([
      redis.get('stats:total_discovered'),
      redis.get('stats:indigenous_identified'),
      redis.scard('hunters:active'),
      redis.llen('queue:discovery'),
      redis.llen('queue:validation'),
      redis.llen('queue:enrichment'),
      redis.llen('queue:export')
    ]);

    const discoveryRate = await this.calculateRate('discovery', 3600); // Last hour
    const verificationRate = await this.calculateRate('verification', 3600);
    const enrichmentRate = await this.calculateRate('enrichment', 3600);

    return {
      totalDiscovered: Number(totalDiscovered) || 0,
      indigenousIdentified: Number(indigenousIdentified) || 0,
      targetBusinesses: 150000,
      activeHunters: activeHunters || 0,
      totalHunters: await redis.scard('hunters:all') || 0,
      discoveryRate,
      verificationRate,
      enrichmentRate,
      queueDepth: (discoveryQueue || 0) + (validationQueue || 0) + (enrichmentQueue || 0) + (exportQueue || 0),
      queues: {
        discovery: discoveryQueue || 0,
        validation: validationQueue || 0,
        enrichment: enrichmentQueue || 0,
        export: exportQueue || 0
      }
    };
  }

  async getMetrics(timeRange: string): Promise<DiscoveryMetrics> {
    const timeline = await this.getTimeline(timeRange);
    const sourceDistribution = await this.getSourceDistribution();
    const provincialDistribution = await this.getProvincialDistribution();
    const errorRates = await this.getErrorRates(timeRange);
    const dataQuality = await this.getDataQuality();

    return {
      timeline,
      sourceDistribution,
      provincialDistribution,
      errorRates,
      dataQuality
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const [redisConnected, activeHunters, errors] = await Promise.all([
      this.checkRedisConnection(),
      redis.scard('hunters:active'),
      this.getRecentErrors()
    ]);

    const cpuUsage = this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();

    const status = errors.length > 10 ? 'critical' :
                  errors.length > 5 ? 'degraded' : 'healthy';

    return {
      status,
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskUsage,
      network: {
        inbound: 0, // Would need actual network monitoring
        outbound: 0
      },
      services: {
        redis: redisConnected,
        postgres: true, // Would check actual connection
        hunters: activeHunters > 0,
        enrichers: true // Would check actual status
      },
      alerts: errors.map(err => ({
        severity: 'error' as const,
        message: err.message,
        timestamp: new Date(err.timestamp)
      }))
    };
  }

  private async calculateRate(type: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const count = await redis.zcount(`metrics:${type}:events`, windowStart, now);
    return Math.round((count / windowSeconds) * 3600); // Convert to per hour
  }

  private async getTimeline(timeRange: string): Promise<any[]> {
    const ranges = {
      '1h': 3600,
      '6h': 21600,
      '24h': 86400,
      '7d': 604800,
      '30d': 2592000
    };

    const seconds = ranges[timeRange] || 86400;
    const buckets = 24; // Always show 24 data points
    const bucketSize = seconds / buckets;
    const now = Date.now();
    const timeline = [];

    for (let i = 0; i < buckets; i++) {
      const bucketEnd = now - (i * bucketSize * 1000);
      const bucketStart = bucketEnd - (bucketSize * 1000);

      const [discovered, verified, enriched] = await Promise.all([
        redis.zcount('metrics:discovery:events', bucketStart, bucketEnd),
        redis.zcount('metrics:verification:events', bucketStart, bucketEnd),
        redis.zcount('metrics:enrichment:events', bucketStart, bucketEnd)
      ]);

      timeline.unshift({
        time: new Date(bucketEnd).toLocaleTimeString(),
        discovered,
        verified,
        enriched
      });
    }

    return timeline;
  }

  private async getSourceDistribution(): Promise<any[]> {
    const sources = await redis.hgetall('stats:sources');
    return Object.entries(sources).map(([name, value]) => ({
      name,
      value: Number(value)
    }));
  }

  private async getProvincialDistribution(): Promise<any[]> {
    const provinces = await redis.hgetall('stats:provinces');
    const indigenous = await redis.hgetall('stats:provinces:indigenous');

    return Object.entries(provinces).map(([province, count]) => ({
      province,
      count: Number(count),
      indigenousCount: Number(indigenous[province]) || 0
    }));
  }

  private async getErrorRates(timeRange: string): Promise<any[]> {
    // Similar to timeline but for errors
    const ranges = {
      '1h': 3600,
      '6h': 21600,
      '24h': 86400,
      '7d': 604800,
      '30d': 2592000
    };

    const seconds = ranges[timeRange] || 86400;
    const buckets = 12;
    const bucketSize = seconds / buckets;
    const now = Date.now();
    const errorRates = [];

    for (let i = 0; i < buckets; i++) {
      const bucketEnd = now - (i * bucketSize * 1000);
      const bucketStart = bucketEnd - (bucketSize * 1000);

      const [errors, total] = await Promise.all([
        redis.zcount('metrics:errors', bucketStart, bucketEnd),
        redis.zcount('metrics:requests', bucketStart, bucketEnd)
      ]);

      const rate = total > 0 ? (errors / total) * 100 : 0;

      errorRates.unshift({
        time: new Date(bucketEnd).toLocaleTimeString(),
        rate: Number(rate.toFixed(2)),
        count: errors
      });
    }

    return errorRates;
  }

  private async getDataQuality(): Promise<any> {
    const [
      total,
      complete,
      verified,
      duplicates,
      enriched
    ] = await Promise.all([
      redis.get('stats:total_discovered'),
      redis.get('stats:complete_records'),
      redis.get('stats:verified_records'),
      redis.get('stats:duplicate_records'),
      redis.get('stats:enriched_records')
    ]);

    const totalNum = Number(total) || 1;

    return {
      completeness: Math.round((Number(complete) / totalNum) * 100),
      accuracy: Math.round((Number(verified) / totalNum) * 100),
      duplicates: Math.round((Number(duplicates) / totalNum) * 100),
      enriched: Math.round((Number(enriched) / totalNum) * 100)
    };
  }

  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return Math.round(100 - (100 * totalIdle / totalTick));
  }

  private getMemoryUsage(): number {
    const total = os.totalmem();
    const free = os.freemem();
    return Math.round(((total - free) / total) * 100);
  }

  private async getDiskUsage(): Promise<number> {
    // This would need a proper disk usage library
    // For now, return a mock value
    return 45;
  }

  private async checkRedisConnection(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async getRecentErrors(): Promise<any[]> {
    const errors = await redis.lrange('errors:recent', 0, 100);
    return errors.map(err => {
      try {
        return JSON.parse(err);
      } catch {
        return { message: err, timestamp: Date.now() };
      }
    });
  }

  async recordEvent(type: string, data: any): Promise<void> {
    const timestamp = Date.now();
    
    // Record in time series
    await redis.zadd(`metrics:${type}:events`, timestamp, JSON.stringify({
      timestamp,
      ...data
    }));

    // Update counters
    if (type === 'discovery') {
      await redis.incr('stats:total_discovered');
      if (data.source) {
        await redis.hincrby('stats:sources', data.source, 1);
      }
      if (data.province) {
        await redis.hincrby('stats:provinces', data.province, 1);
      }
    } else if (type === 'enrichment' && data.isIndigenous) {
      await redis.incr('stats:indigenous_identified');
      if (data.province) {
        await redis.hincrby('stats:provinces:indigenous', data.province, 1);
      }
    }

    // Emit for real-time updates
    this.emit('metric', { type, data, timestamp });
  }

  async recordError(error: Error, context: any): Promise<void> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    };

    await redis.lpush('errors:recent', JSON.stringify(errorData));
    await redis.ltrim('errors:recent', 0, 999); // Keep last 1000 errors
    await redis.zadd('metrics:errors', Date.now(), JSON.stringify(errorData));

    this.emit('error', errorData);
  }

  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}