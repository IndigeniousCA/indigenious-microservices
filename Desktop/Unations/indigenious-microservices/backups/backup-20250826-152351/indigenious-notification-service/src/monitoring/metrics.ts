import express from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

// Collect default metrics
collectDefaultMetrics({ register });

// Custom metrics
export const notificationsSent = new Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'status'],
});

export const notificationDuration = new Histogram({
  name: 'notification_duration_seconds',
  help: 'Duration of notification sending in seconds',
  labelNames: ['channel'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const activeConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

export const queueSize = new Gauge({
  name: 'notification_queue_size',
  help: 'Size of notification queues',
  labelNames: ['queue'],
});

export const providerErrors = new Counter({
  name: 'provider_errors_total',
  help: 'Total number of provider errors',
  labelNames: ['provider', 'error_type'],
});

// Create metrics server
export function startMetricsServer(port: number = 9090): void {
  const app = express();

  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      logger.error('Failed to generate metrics', error);
      res.status(500).end();
    }
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  app.listen(port, () => {
    logger.info(`Metrics server listening on port ${port}`);
  });
}

// Track notification metrics
export function trackNotification(
  channel: string,
  status: 'sent' | 'failed',
  duration?: number
): void {
  notificationsSent.labels(channel, status).inc();
  
  if (duration) {
    notificationDuration.labels(channel).observe(duration / 1000);
  }
}

// Track provider errors
export function trackProviderError(
  provider: string,
  errorType: string
): void {
  providerErrors.labels(provider, errorType).inc();
}

// Update queue metrics
export function updateQueueMetrics(metrics: Record<string, number>): void {
  Object.entries(metrics).forEach(([queue, size]) => {
    queueSize.labels(queue).set(size);
  });
}

// Update connection metrics
export function updateConnectionMetrics(count: number): void {
  activeConnections.set(count);
}

export default {
  startMetricsServer,
  trackNotification,
  trackProviderError,
  updateQueueMetrics,
  updateConnectionMetrics,
};