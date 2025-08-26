/**
 * Distributed Tracing Service
 * SOC 2 Type II Compliant Transaction Tracing and Observability
 * 
 * SOC 2 Controls Addressed:
 * - CC7.1: Detection and monitoring
 * - CC7.2: Incident response
 * - CC7.3: Evaluation of objectives
 * - CC7.4: Monitoring of third parties
 * - A1.2: System monitoring
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/monitoring/logger';
import { auditLogger } from './AuditLogger';
import { performanceMonitoring } from './PerformanceMonitoringService';
import { redisEncryption } from './RedisEncryptionService';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// OpenTelemetry imports (would be added when implementing full OpenTelemetry)
// import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
// import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
// import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

// Trace schemas
const TraceSchema = z.object({
  traceId: z.string(),
  spans: z.array(z.any()),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  service: z.string(),
  operation: z.string(),
  status: z.enum(['in_progress', 'completed', 'failed']),
  metadata: z.record(z.any()).optional(),
  tags: z.record(z.string()).optional(),
  errors: z.array(z.any()).optional()
});

const SpanSchema = z.object({
  spanId: z.string(),
  traceId: z.string(),
  parentSpanId: z.string().optional(),
  operationName: z.string(),
  service: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  status: z.enum(['ok', 'error', 'cancelled']),
  attributes: z.record(z.any()).optional(),
  events: z.array(z.object({
    name: z.string(),
    timestamp: z.date(),
    attributes: z.record(z.any()).optional()
  })).optional(),
  links: z.array(z.object({
    traceId: z.string(),
    spanId: z.string(),
    attributes: z.record(z.any()).optional()
  })).optional()
});

const TracingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  samplingRate: z.number().min(0).max(1).default(0.1), // 10% default sampling
  exporters: z.array(z.enum(['jaeger', 'zipkin', 'otlp', 'console'])).default(['console']),
  propagators: z.array(z.enum(['w3c', 'jaeger', 'b3'])).default(['w3c']),
  serviceNameMapping: z.record(z.string()).optional(),
  sensitiveDataRedaction: z.boolean().default(true),
  maxTraceAge: z.number().default(86400000), // 24 hours in ms
  batchSize: z.number().default(100),
  exportInterval: z.number().default(5000) // 5 seconds
});

type Trace = z.infer<typeof TraceSchema>;
type Span = z.infer<typeof SpanSchema>;
type TracingConfig = z.infer<typeof TracingConfigSchema>;

// Context storage for trace propagation
const traceContext = new AsyncLocalStorage<TraceContext>();

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

export class DistributedTracingService extends EventEmitter {
  private static instance: DistributedTracingService;
  private config: TracingConfig;
  private traces: Map<string, Trace> = new Map();
  private spans: Map<string, Span> = new Map();
  private exportQueue: Span[] = [];
  private exportTimer?: NodeJS.Timeout;
  
  // Service names for the platform
  private readonly SERVICES = {
    BANK_INTEGRATION: 'bank-integration',
    SCOTIA_ADAPTER: 'scotia-adapter',
    RBC_ADAPTER: 'rbc-adapter',
    MFA_SERVICE: 'mfa-service',
    FRAUD_DETECTION: 'fraud-detection',
    AUDIT_LOGGER: 'audit-logger',
    REDIS_CACHE: 'redis-cache',
    PERFORMANCE_MONITOR: 'performance-monitor'
  };
  
  // Critical operations to always trace
  private readonly CRITICAL_OPERATIONS = [
    'payment_processing',
    'account_creation',
    'fraud_check',
    'mfa_verification',
    'bank_authentication',
    'transaction_validation'
  ];
  
  private constructor() {
    super();
    this.config = this.loadConfig();
    this.initializeTracing();
    this.startExporter();
  }
  
  static getInstance(): DistributedTracingService {
    if (!DistributedTracingService.instance) {
      DistributedTracingService.instance = new DistributedTracingService();
    }
    return DistributedTracingService.instance;
  }
  
  /**
   * Start a new trace
   * SOC 2 CC7.1: Transaction monitoring
   */
  startTrace(
    operation: string,
    service: string = this.SERVICES.BANK_INTEGRATION,
    attributes?: Record<string, any>
  ): TraceContext {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    
    // Check sampling decision
    if (!this.shouldSample(operation)) {
      return { traceId, spanId };
    }
    
    const trace: Trace = {
      traceId,
      spans: [],
      startTime: new Date(),
      service,
      operation,
      status: 'in_progress',
      metadata: attributes,
      tags: {
        'service.name': service,
        'operation.name': operation,
        'environment': process.env.NODE_ENV || 'development'
      }
    };
    
    this.traces.set(traceId, trace);
    
    // Create root span
    this.startSpan(operation, {
      traceId,
      spanId,
      service,
      attributes
    });
    
    logger.debug('Trace started', { traceId, operation, service });
    
    return { traceId, spanId };
  }
  
  /**
   * Start a new span within a trace
   * SOC 2 CC7.2: Detailed operation tracking
   */
  startSpan(
    operationName: string,
    options?: {
      traceId?: string;
      spanId?: string;
      parentSpanId?: string;
      service?: string;
      attributes?: Record<string, any>;
    }
  ): string {
    const context = traceContext.getStore() || {} as TraceContext;
    const traceId = options?.traceId || context.traceId || this.generateTraceId();
    const spanId = options?.spanId || this.generateSpanId();
    const parentSpanId = options?.parentSpanId || context.spanId;
    
    const span: Span = {
      spanId,
      traceId,
      parentSpanId,
      operationName,
      service: options?.service || this.SERVICES.BANK_INTEGRATION,
      startTime: new Date(),
      status: 'ok',
      attributes: {
        ...options?.attributes,
        'span.kind': parentSpanId ? 'internal' : 'server'
      }
    };
    
    this.spans.set(spanId, span);
    
    // Add span to trace
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.spans.push(spanId);
    }
    
    // Track with performance monitoring
    performanceMonitoring.startMetric(
      'bank_api_call',
      operationName,
      { traceId, spanId }
    );
    
    return spanId;
  }
  
  /**
   * End a span
   * SOC 2 A1.2: Operation completion tracking
   */
  endSpan(
    spanId: string,
    status: 'ok' | 'error' | 'cancelled' = 'ok',
    attributes?: Record<string, any>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn('Span not found', { spanId });
      return;
    }
    
    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;
    
    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes };
    }
    
    // End performance metric
    performanceMonitoring.endMetric(
      `${span.service}_${span.operationName}_${spanId}`,
      status === 'ok' ? 'success' : 'failure'
    );
    
    // Add to export queue
    this.exportQueue.push(span);
    
    // Check if this completes the trace
    this.checkTraceCompletion(span.traceId);
    
    logger.debug('Span ended', {
      spanId,
      traceId: span.traceId,
      duration: span.duration,
      status
    });
  }
  
  /**
   * Add event to current span
   * SOC 2 CC7.1: Event tracking within operations
   */
  addSpanEvent(
    spanId: string,
    eventName: string,
    attributes?: Record<string, any>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn('Cannot add event - span not found', { spanId });
      return;
    }
    
    if (!span.events) {
      span.events = [];
    }
    
    span.events.push({
      name: eventName,
      timestamp: new Date(),
      attributes: this.redactSensitiveData(attributes)
    });
    
    // Log significant events
    if (this.isSignificantEvent(eventName)) {
      logger.info('Significant trace event', {
        spanId,
        traceId: span.traceId,
        event: eventName
      });
    }
  }
  
  /**
   * Link spans across traces
   * SOC 2 CC7.4: Cross-service correlation
   */
  linkSpans(
    spanId: string,
    linkedTraceId: string,
    linkedSpanId: string,
    attributes?: Record<string, any>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn('Cannot add link - span not found', { spanId });
      return;
    }
    
    if (!span.links) {
      span.links = [];
    }
    
    span.links.push({
      traceId: linkedTraceId,
      spanId: linkedSpanId,
      attributes
    });
  }
  
  /**
   * Execute function with tracing context
   * SOC 2 CC7.2: Automatic trace propagation
   */
  async withTrace<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: {
      service?: string;
      attributes?: Record<string, any>;
      parentContext?: TraceContext;
    }
  ): Promise<T> {
    const parentContext = options?.parentContext || traceContext.getStore();
    
    // Start new trace or continue existing
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId
    };
    
    // Start span
    this.startSpan(operation, {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      service: options?.service,
      attributes: options?.attributes
    });
    
    try {
      // Execute function with trace context
      const result = await traceContext.run(context, fn);
      
      // End span successfully
      this.endSpan(spanId, 'ok');
      
      return result;
    } catch (error) {
      // Record error
      this.addSpanEvent(spanId, 'error', {
        'error.type': error.constructor.name,
        'error.message': error.message,
        'error.stack': error.stack
      });
      
      // End span with error
      this.endSpan(spanId, 'error', {
        'error.occurred': true
      });
      
      throw error;
    }
  }
  
  /**
   * Get current trace context
   */
  getCurrentContext(): TraceContext | undefined {
    return traceContext.getStore();
  }
  
  /**
   * Inject trace context for propagation
   * SOC 2 CC7.4: Context propagation
   */
  inject(carrier: Record<string, string>): void {
    const context = traceContext.getStore();
    if (!context) return;
    
    // W3C Trace Context format
    carrier['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
    
    if (context.baggage) {
      carrier['baggage'] = Object.entries(context.baggage)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
    }
  }
  
  /**
   * Extract trace context from carrier
   */
  extract(carrier: Record<string, string>): TraceContext | null {
    const traceparent = carrier['traceparent'];
    if (!traceparent) return null;
    
    // Parse W3C format: version-traceId-spanId-flags
    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;
    
    const context: TraceContext = {
      traceId: parts[1],
      spanId: parts[2]
    };
    
    // Parse baggage if present
    if (carrier['baggage']) {
      context.baggage = {};
      carrier['baggage'].split(',').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          context.baggage![key] = value;
        }
      });
    }
    
    return context;
  }
  
  /**
   * Get trace by ID
   * SOC 2 CC7.3: Trace retrieval for analysis
   */
  async getTrace(traceId: string): Promise<Trace | null> {
    // Check memory first
    let trace = this.traces.get(traceId);
    
    if (!trace) {
      // Try Redis cache
      trace = await redisEncryption.getEncrypted(`trace:${traceId}`);
    }
    
    if (trace) {
      // Enrich with spans
      const spans = await this.getTraceSpans(traceId);
      trace.spans = spans.map(s => s.spanId);
    }
    
    return trace;
  }
  
  /**
   * Get all spans for a trace
   */
  async getTraceSpans(traceId: string): Promise<Span[]> {
    const spans: Span[] = [];
    
    // Check memory
    for (const [id, span] of this.spans) {
      if (span.traceId === traceId) {
        spans.push(span);
      }
    }
    
    // Check Redis for older spans
    const cachedSpans = await redisEncryption.getEncrypted<Span[]>(`trace:${traceId}:spans`);
    if (cachedSpans) {
      spans.push(...cachedSpans);
    }
    
    // Sort by start time
    return spans.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  /**
   * Search traces
   * SOC 2 CC7.1: Trace discovery and analysis
   */
  async searchTraces(
    criteria: {
      service?: string;
      operation?: string;
      startTime?: Date;
      endTime?: Date;
      status?: 'completed' | 'failed' | 'in_progress';
      minDuration?: number;
      maxDuration?: number;
      tags?: Record<string, string>;
    }
  ): Promise<Trace[]> {
    const results: Trace[] = [];
    
    // Search in memory
    for (const [id, trace] of this.traces) {
      if (this.matchesSearchCriteria(trace, criteria)) {
        results.push(trace);
      }
    }
    
    // Would also search in persistent storage in production
    
    return results.slice(0, 100); // Limit results
  }
  
  /**
   * Get service dependency map
   * SOC 2 CC7.4: Service interaction analysis
   */
  async getServiceDependencies(
    service: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    const dependencies = new Map<string, {
      callCount: number;
      errorCount: number;
      avgDuration: number;
    }>();
    
    // Analyze spans
    for (const [id, span] of this.spans) {
      if (span.service === service && span.parentSpanId) {
        const parentSpan = this.spans.get(span.parentSpanId);
        if (parentSpan && parentSpan.service !== service) {
          const key = `${parentSpan.service}->${service}`;
          const stats = dependencies.get(key) || {
            callCount: 0,
            errorCount: 0,
            avgDuration: 0
          };
          
          stats.callCount++;
          if (span.status === 'error') stats.errorCount++;
          stats.avgDuration = (stats.avgDuration * (stats.callCount - 1) + (span.duration || 0)) / stats.callCount;
          
          dependencies.set(key, stats);
        }
      }
    }
    
    return {
      service,
      dependencies: Array.from(dependencies.entries()).map(([key, stats]) => ({
        relationship: key,
        ...stats,
        errorRate: stats.callCount > 0 ? (stats.errorCount / stats.callCount) * 100 : 0
      }))
    };
  }
  
  /**
   * Get trace metrics
   * SOC 2 A1.2: Performance metrics from traces
   */
  async getTraceMetrics(
    timeRange: { start: Date; end: Date }
  ): Promise<any> {
    const metrics = {
      totalTraces: 0,
      completedTraces: 0,
      failedTraces: 0,
      avgDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      errorRate: 0,
      throughput: 0,
      serviceBreakdown: {} as Record<string, any>
    };
    
    const durations: number[] = [];
    const serviceCounts = new Map<string, number>();
    
    for (const [id, trace] of this.traces) {
      if (trace.startTime >= timeRange.start && trace.startTime <= timeRange.end) {
        metrics.totalTraces++;
        
        if (trace.status === 'completed') {
          metrics.completedTraces++;
          if (trace.duration) durations.push(trace.duration);
        } else if (trace.status === 'failed') {
          metrics.failedTraces++;
        }
        
        // Count by service
        const count = serviceCounts.get(trace.service) || 0;
        serviceCounts.set(trace.service, count + 1);
      }
    }
    
    // Calculate metrics
    if (durations.length > 0) {
      metrics.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      durations.sort((a, b) => a - b);
      metrics.p95Duration = durations[Math.floor(durations.length * 0.95)];
      metrics.p99Duration = durations[Math.floor(durations.length * 0.99)];
    }
    
    metrics.errorRate = metrics.totalTraces > 0 
      ? (metrics.failedTraces / metrics.totalTraces) * 100 
      : 0;
    
    const timeRangeMs = timeRange.end.getTime() - timeRange.start.getTime();
    metrics.throughput = (metrics.totalTraces / timeRangeMs) * 1000 * 60; // Per minute
    
    // Service breakdown
    for (const [service, count] of serviceCounts) {
      metrics.serviceBreakdown[service] = {
        count,
        percentage: (count / metrics.totalTraces) * 100
      };
    }
    
    return metrics;
  }
  
  /**
   * Export traces for external analysis
   * SOC 2 CC3.2: Data export for compliance
   */
  async exportTraces(
    format: 'otlp' | 'jaeger' | 'zipkin',
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    const traces = timeRange 
      ? await this.searchTraces({
          startTime: timeRange.start,
          endTime: timeRange.end
        })
      : Array.from(this.traces.values());
    
    switch (format) {
      case 'otlp':
        return this.convertToOTLP(traces);
      case 'jaeger':
        return this.convertToJaeger(traces);
      case 'zipkin':
        return this.convertToZipkin(traces);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  // Private helper methods
  
  private loadConfig(): TracingConfig {
    const defaultConfig: TracingConfig = {
      enabled: true,
      samplingRate: 0.1,
      exporters: ['console'],
      propagators: ['w3c'],
      sensitiveDataRedaction: true,
      maxTraceAge: 86400000,
      batchSize: 100,
      exportInterval: 5000
    };
    
    // Override with environment variables if present
    if (process.env.TRACING_SAMPLING_RATE) {
      defaultConfig.samplingRate = parseFloat(process.env.TRACING_SAMPLING_RATE);
    }
    
    return TracingConfigSchema.parse(defaultConfig);
  }
  
  private initializeTracing(): void {
    // Initialize OpenTelemetry providers
    // This would set up the actual tracing infrastructure
    logger.info('Distributed tracing initialized', {
      samplingRate: this.config.samplingRate,
      exporters: this.config.exporters
    });
  }
  
  private startExporter(): void {
    this.exportTimer = setInterval(() => {
      this.exportBatch();
    }, this.config.exportInterval);
  }
  
  private async exportBatch(): Promise<void> {
    if (this.exportQueue.length === 0) return;
    
    const batch = this.exportQueue.splice(0, this.config.batchSize);
    
    try {
      // Export to configured exporters
      for (const exporter of this.config.exporters) {
        await this.exportToBackend(exporter, batch);
      }
      
      // Cache spans
      for (const span of batch) {
        const key = `trace:${span.traceId}:spans`;
        const existing = await redisEncryption.getEncrypted<Span[]>(key) || [];
        existing.push(span);
        await redisEncryption.setEncrypted(key, existing, 86400); // 24 hour TTL
      }
      
    } catch (error) {
      logger.error('Failed to export trace batch', { error, batchSize: batch.length });
      // Re-queue failed exports
      this.exportQueue.unshift(...batch);
    }
  }
  
  private async exportToBackend(exporter: string, spans: Span[]): Promise<void> {
    switch (exporter) {
      case 'console':
        logger.info('Trace export', { spans: spans.length });
        break;
      case 'jaeger':
        // Would send to Jaeger backend
        break;
      case 'zipkin':
        // Would send to Zipkin backend
        break;
      case 'otlp':
        // Would send via OTLP protocol
        break;
    }
  }
  
  private generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }
  
  private generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }
  
  private shouldSample(operation: string): boolean {
    // Always sample critical operations
    if (this.CRITICAL_OPERATIONS.includes(operation)) {
      return true;
    }
    
    // Use sampling rate for others
    return Math.random() < this.config.samplingRate;
  }
  
  private redactSensitiveData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data || !this.config.sensitiveDataRedaction) return data;
    
    const redacted = { ...data };
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'authorization'];
    
    for (const key in redacted) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      }
    }
    
    return redacted;
  }
  
  private isSignificantEvent(eventName: string): boolean {
    const significantEvents = [
      'error',
      'payment_initiated',
      'payment_completed',
      'fraud_detected',
      'mfa_required',
      'authentication_failed'
    ];
    
    return significantEvents.includes(eventName.toLowerCase());
  }
  
  private checkTraceCompletion(traceId: string): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    
    // Check if all spans are completed
    const allSpansCompleted = trace.spans.every(spanId => {
      const span = this.spans.get(spanId);
      return span && span.endTime;
    });
    
    if (allSpansCompleted && trace.status === 'in_progress') {
      trace.endTime = new Date();
      trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
      
      // Check if any span failed
      const hasFailure = trace.spans.some(spanId => {
        const span = this.spans.get(spanId);
        return span && span.status === 'error';
      });
      
      trace.status = hasFailure ? 'failed' : 'completed';
      
      // Emit trace completed event
      this.emit('trace-completed', trace);
      
      // Clean up old traces
      this.cleanupOldTraces();
    }
  }
  
  private cleanupOldTraces(): void {
    const cutoff = Date.now() - this.config.maxTraceAge;
    
    for (const [id, trace] of this.traces) {
      if (trace.startTime.getTime() < cutoff) {
        this.traces.delete(id);
        
        // Clean up associated spans
        trace.spans.forEach(spanId => this.spans.delete(spanId));
      }
    }
  }
  
  private matchesSearchCriteria(trace: Trace, criteria: any): boolean {
    if (criteria.service && trace.service !== criteria.service) return false;
    if (criteria.operation && trace.operation !== criteria.operation) return false;
    if (criteria.status && trace.status !== criteria.status) return false;
    
    if (criteria.startTime && trace.startTime < criteria.startTime) return false;
    if (criteria.endTime && trace.startTime > criteria.endTime) return false;
    
    if (criteria.minDuration && trace.duration && trace.duration < criteria.minDuration) return false;
    if (criteria.maxDuration && trace.duration && trace.duration > criteria.maxDuration) return false;
    
    if (criteria.tags) {
      for (const [key, value] of Object.entries(criteria.tags)) {
        if (trace.tags?.[key] !== value) return false;
      }
    }
    
    return true;
  }
  
  private convertToOTLP(traces: Trace[]): any {
    // Convert to OpenTelemetry Protocol format
    return {
      resourceSpans: traces.map(trace => ({
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: trace.service } }
          ]
        },
        instrumentationLibrarySpans: [{
          spans: trace.spans.map(spanId => {
            const span = this.spans.get(spanId);
            return span ? this.spanToOTLP(span) : null;
          }).filter(Boolean)
        }]
      }))
    };
  }
  
  private spanToOTLP(span: Span): any {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.operationName,
      startTimeUnixNano: span.startTime.getTime() * 1000000,
      endTimeUnixNano: span.endTime ? span.endTime.getTime() * 1000000 : undefined,
      attributes: Object.entries(span.attributes || {}).map(([k, v]) => ({
        key: k,
        value: { stringValue: String(v) }
      })),
      status: {
        code: span.status === 'ok' ? 1 : 2
      }
    };
  }
  
  private convertToJaeger(traces: Trace[]): any {
    // Convert to Jaeger format
    return traces.map(trace => ({
      traceID: trace.traceId,
      spans: trace.spans.map(spanId => {
        const span = this.spans.get(spanId);
        return span ? {
          spanID: span.spanId,
          operationName: span.operationName,
          startTime: span.startTime.getTime() * 1000,
          duration: span.duration ? span.duration * 1000 : 0,
          tags: Object.entries(span.attributes || {}).map(([k, v]) => ({
            key: k,
            type: 'string',
            value: String(v)
          }))
        } : null;
      }).filter(Boolean),
      process: {
        serviceName: trace.service,
        tags: []
      }
    }));
  }
  
  private convertToZipkin(traces: Trace[]): any {
    // Convert to Zipkin format
    const zipkinSpans: any[] = [];
    
    for (const trace of traces) {
      for (const spanId of trace.spans) {
        const span = this.spans.get(spanId);
        if (span) {
          zipkinSpans.push({
            traceId: span.traceId,
            id: span.spanId,
            parentId: span.parentSpanId,
            name: span.operationName,
            timestamp: span.startTime.getTime() * 1000,
            duration: span.duration ? span.duration * 1000 : 0,
            localEndpoint: {
              serviceName: span.service
            },
            tags: span.attributes
          });
        }
      }
    }
    
    return zipkinSpans;
  }
}

// Export singleton instance
export const distributedTracing = DistributedTracingService.getInstance();

// Export context utilities
export const tracing = {
  /**
   * Start a new trace or continue existing
   */
  async trace<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: {
      service?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<T> {
    return distributedTracing.withTrace(operation, fn, options);
  },
  
  /**
   * Add event to current span
   */
  addEvent(eventName: string, attributes?: Record<string, any>): void {
    const context = distributedTracing.getCurrentContext();
    if (context?.spanId) {
      distributedTracing.addSpanEvent(context.spanId, eventName, attributes);
    }
  },
  
  /**
   * Get current trace context
   */
  getContext(): TraceContext | undefined {
    return distributedTracing.getCurrentContext();
  },
  
  /**
   * Create child span
   */
  span(operationName: string, attributes?: Record<string, any>): {
    end: (status?: 'ok' | 'error' | 'cancelled') => void;
  } {
    const spanId = distributedTracing.startSpan(operationName, { attributes });
    
    return {
      end: (status = 'ok') => distributedTracing.endSpan(spanId, status)
    };
  }
};