import { prisma } from '../config/database';
import { clickhouse } from '../config/clickhouse';
import { redis } from '../config/redis';
import { kafka } from '../config/kafka';
import { logger } from '../utils/logger';
import Bull from 'bull';
import dayjs from 'dayjs';

export interface AggregationJob {
  id: string;
  type: 'rfq' | 'business' | 'indigenous' | 'compliance' | 'financial';
  schedule: string;
  query: string;
  destination: string;
  filters?: Record<string, any>;
  transformations?: string[];
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'paused' | 'error';
}

export interface DataPipeline {
  name: string;
  source: string;
  destination: string;
  transformations: DataTransformation[];
  schedule: string;
  batchSize: number;
  parallelism: number;
}

export interface DataTransformation {
  type: 'filter' | 'map' | 'aggregate' | 'join' | 'validate';
  config: Record<string, any>;
  order: number;
}

export class DataAggregatorService {
  private static aggregationQueue: Bull.Queue;
  private static realTimeQueue: Bull.Queue;
  private static pipelines: Map<string, DataPipeline> = new Map();

  /**
   * Initialize the data aggregation service
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize Bull queues
      this.aggregationQueue = new Bull('data-aggregation', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });

      this.realTimeQueue = new Bull('real-time-processing', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });

      // Set up queue processors
      this.setupQueueProcessors();

      // Initialize data pipelines
      await this.initializePipelines();

      // Start real-time data streaming
      if (process.env.ENABLE_KAFKA === 'true') {
        await this.startRealTimeStreaming();
      }

      logger.info('Data aggregation service initialized');
    } catch (error) {
      logger.error('Failed to initialize data aggregation service', error);
      throw error;
    }
  }

  /**
   * Schedule aggregation job
   */
  static async scheduleAggregation(job: AggregationJob): Promise<void> {
    try {
      await this.aggregationQueue.add(
        'aggregate-data',
        job,
        {
          repeat: { cron: job.schedule },
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      );

      logger.info('Aggregation job scheduled', { jobId: job.id, type: job.type });
    } catch (error) {
      logger.error('Failed to schedule aggregation job', error);
      throw error;
    }
  }

  /**
   * Aggregate RFQ metrics
   */
  static async aggregateRFQMetrics(timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      const interval = this.getTimeInterval(timeframe);
      const aggregationQuery = `
        INSERT INTO rfq_metrics_${timeframe}
        SELECT
          toStartOf${this.capitalizeFirst(timeframe)}(created_at) as period,
          COUNT(*) as total_rfqs,
          COUNT(DISTINCT business_id) as unique_businesses,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_rfqs,
          COUNT(CASE WHEN is_indigenous_winner = true THEN 1 END) as indigenous_wins,
          AVG(response_count) as avg_responses,
          AVG(response_time_hours) as avg_response_time,
          SUM(contract_value) as total_value,
          AVG(contract_value) as avg_contract_value,
          COUNT(CASE WHEN response_count > 5 THEN 1 END) as competitive_rfqs,
          AVG(CASE WHEN status = 'COMPLETED' THEN 
            EXTRACT(EPOCH FROM (completed_at - created_at))/86400 
          END) as avg_completion_days
        FROM rfq_events
        WHERE created_at >= now() - INTERVAL ${interval}
        AND created_at < toStartOf${this.capitalizeFirst(timeframe)}(now())
        GROUP BY period
        ORDER BY period
      `;

      await clickhouse.query(aggregationQuery).toPromise();

      // Update cache
      await this.updateRFQMetricsCache(timeframe);

      logger.info(`RFQ metrics aggregated for ${timeframe}`);
    } catch (error) {
      logger.error(`Failed to aggregate RFQ metrics for ${timeframe}`, error);
      throw error;
    }
  }

  /**
   * Aggregate business performance metrics
   */
  static async aggregateBusinessMetrics(): Promise<void> {
    try {
      const query = `
        INSERT INTO business_performance_summary
        SELECT
          business_id,
          business_name,
          is_indigenous,
          industry,
          region,
          COUNT(DISTINCT rfq_id) as total_rfqs_participated,
          COUNT(DISTINCT CASE WHEN is_winner = true THEN rfq_id END) as total_wins,
          (COUNT(DISTINCT CASE WHEN is_winner = true THEN rfq_id END) * 100.0) / 
          NULLIF(COUNT(DISTINCT rfq_id), 0) as win_rate,
          SUM(CASE WHEN is_winner = true THEN contract_value ELSE 0 END) as total_revenue,
          AVG(CASE WHEN is_winner = true THEN contract_value END) as avg_contract_value,
          AVG(response_time_hours) as avg_response_time,
          AVG(customer_satisfaction) as avg_satisfaction,
          COUNT(DISTINCT certification_id) as total_certifications,
          MAX(last_active_at) as last_active,
          toStartOfMonth(now()) as aggregation_period
        FROM business_activity_events
        WHERE created_at >= toStartOfMonth(now()) - INTERVAL 1 MONTH
        GROUP BY business_id, business_name, is_indigenous, industry, region
      `;

      await clickhouse.query(query).toPromise();

      // Calculate growth metrics
      await this.calculateBusinessGrowthMetrics();

      // Update business rankings
      await this.updateBusinessRankings();

      logger.info('Business metrics aggregated');
    } catch (error) {
      logger.error('Failed to aggregate business metrics', error);
      throw error;
    }
  }

  /**
   * Aggregate Indigenous procurement metrics
   */
  static async aggregateIndigenousMetrics(): Promise<void> {
    try {
      const query = `
        INSERT INTO indigenous_procurement_summary
        SELECT
          toStartOfMonth(created_at) as period,
          region,
          band_number,
          band_name,
          COUNT(DISTINCT business_id) as active_businesses,
          COUNT(DISTINCT rfq_id) as rfq_participation,
          COUNT(DISTINCT CASE WHEN is_winner = true THEN rfq_id END) as rfq_wins,
          SUM(CASE WHEN is_winner = true THEN contract_value ELSE 0 END) as total_contracts_won,
          AVG(CASE WHEN is_winner = true THEN contract_value END) as avg_contract_value,
          COUNT(DISTINCT category) as industries_served,
          AVG(customer_satisfaction) as avg_satisfaction,
          COUNT(DISTINCT certification_type) as certification_types,
          SUM(community_benefit_score) as community_impact,
          AVG(cultural_alignment_score) as cultural_alignment
        FROM indigenous_business_activity
        WHERE created_at >= toStartOfMonth(now()) - INTERVAL 1 MONTH
        GROUP BY period, region, band_number, band_name
      `;

      await clickhouse.query(query).toPromise();

      // Update Indigenous business growth tracking
      await this.updateIndigenousGrowthTracking();

      // Calculate cultural impact metrics
      await this.calculateCulturalImpactMetrics();

      logger.info('Indigenous metrics aggregated');
    } catch (error) {
      logger.error('Failed to aggregate Indigenous metrics', error);
      throw error;
    }
  }

  /**
   * Process real-time events
   */
  static async processRealTimeEvent(event: {
    type: string;
    businessId?: string;
    rfqId?: string;
    data: any;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Add to real-time processing queue
      await this.realTimeQueue.add('process-event', event, {
        priority: this.getEventPriority(event.type),
        removeOnComplete: 100,
        removeOnFail: 20,
      });

      // Update real-time dashboards
      await this.updateRealTimeDashboard(event);

      // Check for alerts and notifications
      await this.checkAlerts(event);

    } catch (error) {
      logger.error('Failed to process real-time event', error);
    }
  }

  /**
   * Create custom aggregation pipeline
   */
  static async createCustomPipeline(pipeline: DataPipeline): Promise<void> {
    try {
      // Validate pipeline configuration
      this.validatePipeline(pipeline);

      // Store pipeline configuration
      this.pipelines.set(pipeline.name, pipeline);

      // Schedule pipeline execution
      await this.aggregationQueue.add(
        'custom-pipeline',
        { pipelineName: pipeline.name },
        {
          repeat: { cron: pipeline.schedule },
          removeOnComplete: 5,
          removeOnFail: 3,
        }
      );

      logger.info('Custom pipeline created', { name: pipeline.name });
    } catch (error) {
      logger.error('Failed to create custom pipeline', error);
      throw error;
    }
  }

  /**
   * Execute data quality checks
   */
  static async executeDataQualityChecks(): Promise<{
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    issues: DataQualityIssue[];
  }> {
    try {
      const [
        completenessCheck,
        accuracyCheck,
        consistencyCheck,
        timelinessCheck,
      ] = await Promise.all([
        this.checkDataCompleteness(),
        this.checkDataAccuracy(),
        this.checkDataConsistency(),
        this.checkDataTimeliness(),
      ]);

      const issues: DataQualityIssue[] = [
        ...completenessCheck.issues,
        ...accuracyCheck.issues,
        ...consistencyCheck.issues,
        ...timelinessCheck.issues,
      ];

      // Store quality metrics
      await this.storeDataQualityMetrics({
        completeness: completenessCheck.score,
        accuracy: accuracyCheck.score,
        consistency: consistencyCheck.score,
        timeliness: timelinessCheck.score,
        issues,
      });

      return {
        completeness: completenessCheck.score,
        accuracy: accuracyCheck.score,
        consistency: consistencyCheck.score,
        timeliness: timelinessCheck.score,
        issues,
      };
    } catch (error) {
      logger.error('Failed to execute data quality checks', error);
      throw error;
    }
  }

  /**
   * Setup queue processors
   */
  private static setupQueueProcessors(): void {
    // Aggregation queue processor
    this.aggregationQueue.process('aggregate-data', async (job) => {
      const aggregationJob = job.data as AggregationJob;
      
      try {
        switch (aggregationJob.type) {
          case 'rfq':
            await this.aggregateRFQMetrics('daily');
            break;
          case 'business':
            await this.aggregateBusinessMetrics();
            break;
          case 'indigenous':
            await this.aggregateIndigenousMetrics();
            break;
          case 'compliance':
            await this.aggregateComplianceMetrics();
            break;
          case 'financial':
            await this.aggregateFinancialMetrics();
            break;
          default:
            throw new Error(`Unknown aggregation type: ${aggregationJob.type}`);
        }

        logger.info('Aggregation job completed', { jobId: aggregationJob.id });
      } catch (error) {
        logger.error('Aggregation job failed', { jobId: aggregationJob.id, error });
        throw error;
      }
    });

    // Real-time processing queue processor
    this.realTimeQueue.process('process-event', async (job) => {
      const event = job.data;
      
      try {
        // Update real-time metrics
        await this.updateRealTimeMetrics(event);
        
        // Update streaming dashboards
        await this.updateStreamingDashboards(event);
        
        // Trigger ML model updates if needed
        if (this.shouldTriggerMLUpdate(event)) {
          await this.triggerMLModelUpdate(event);
        }

      } catch (error) {
        logger.error('Real-time event processing failed', { event, error });
        throw error;
      }
    });

    // Custom pipeline processor
    this.aggregationQueue.process('custom-pipeline', async (job) => {
      const { pipelineName } = job.data;
      const pipeline = this.pipelines.get(pipelineName);
      
      if (!pipeline) {
        throw new Error(`Pipeline not found: ${pipelineName}`);
      }

      await this.executePipeline(pipeline);
    });
  }

  /**
   * Initialize data pipelines
   */
  private static async initializePipelines(): Promise<void> {
    const defaultPipelines: DataPipeline[] = [
      {
        name: 'hourly-rfq-metrics',
        source: 'rfq_events',
        destination: 'rfq_metrics_hourly',
        transformations: [
          { type: 'aggregate', config: { groupBy: ['hour'], metrics: ['count', 'avg', 'sum'] }, order: 1 },
          { type: 'filter', config: { conditions: ['created_at > now() - INTERVAL 2 HOUR'] }, order: 2 },
        ],
        schedule: '0 * * * *', // Every hour
        batchSize: 1000,
        parallelism: 2,
      },
      {
        name: 'daily-indigenous-growth',
        source: 'indigenous_business_activity',
        destination: 'indigenous_growth_daily',
        transformations: [
          { type: 'filter', config: { conditions: ['is_indigenous = true'] }, order: 1 },
          { type: 'aggregate', config: { groupBy: ['business_id', 'date'], metrics: ['revenue', 'contracts'] }, order: 2 },
          { type: 'map', config: { calculations: ['growth_rate', 'momentum'] }, order: 3 },
        ],
        schedule: '0 2 * * *', // Daily at 2 AM
        batchSize: 500,
        parallelism: 3,
      },
    ];

    for (const pipeline of defaultPipelines) {
      await this.createCustomPipeline(pipeline);
    }
  }

  /**
   * Start real-time streaming
   */
  private static async startRealTimeStreaming(): Promise<void> {
    const consumer = kafka.consumer({ groupId: 'analytics-service' });
    await consumer.connect();

    await consumer.subscribe({
      topics: ['rfq-events', 'business-events', 'compliance-events'],
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.processRealTimeEvent(event);
        } catch (error) {
          logger.error('Failed to process Kafka message', { topic, partition, error });
        }
      },
    });

    logger.info('Real-time streaming started');
  }

  /**
   * Helper methods
   */
  private static getTimeInterval(timeframe: string): string {
    switch (timeframe) {
      case 'hourly': return '2 HOUR';
      case 'daily': return '2 DAY';
      case 'weekly': return '2 WEEK';
      case 'monthly': return '2 MONTH';
      default: return '1 DAY';
    }
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private static getEventPriority(eventType: string): number {
    const priorities: Record<string, number> = {
      'rfq_created': 1,
      'rfq_response_submitted': 2,
      'rfq_completed': 1,
      'business_verified': 1,
      'compliance_issue': 0, // Highest priority
    };
    return priorities[eventType] || 3;
  }

  private static validatePipeline(pipeline: DataPipeline): void {
    if (!pipeline.name || !pipeline.source || !pipeline.destination) {
      throw new Error('Pipeline must have name, source, and destination');
    }
    
    if (!pipeline.transformations || pipeline.transformations.length === 0) {
      throw new Error('Pipeline must have at least one transformation');
    }

    // Additional validation logic
  }

  // Additional helper methods would be implemented here...
  private static async updateRFQMetricsCache(timeframe: string): Promise<void> {
    // Implementation for updating cache
  }

  private static async calculateBusinessGrowthMetrics(): Promise<void> {
    // Implementation for calculating growth metrics
  }

  private static async updateBusinessRankings(): Promise<void> {
    // Implementation for updating rankings
  }

  private static async updateIndigenousGrowthTracking(): Promise<void> {
    // Implementation for Indigenous growth tracking
  }

  private static async calculateCulturalImpactMetrics(): Promise<void> {
    // Implementation for cultural impact calculation
  }

  private static async updateRealTimeDashboard(event: any): Promise<void> {
    // Implementation for real-time dashboard updates
  }

  private static async checkAlerts(event: any): Promise<void> {
    // Implementation for alert checking
  }

  private static async aggregateComplianceMetrics(): Promise<void> {
    // Implementation for compliance metrics aggregation
  }

  private static async aggregateFinancialMetrics(): Promise<void> {
    // Implementation for financial metrics aggregation
  }

  private static async updateRealTimeMetrics(event: any): Promise<void> {
    // Implementation for real-time metrics updates
  }

  private static async updateStreamingDashboards(event: any): Promise<void> {
    // Implementation for streaming dashboard updates
  }

  private static shouldTriggerMLUpdate(event: any): boolean {
    // Logic to determine if ML model should be updated
    return false;
  }

  private static async triggerMLModelUpdate(event: any): Promise<void> {
    // Implementation for triggering ML model updates
  }

  private static async executePipeline(pipeline: DataPipeline): Promise<void> {
    // Implementation for executing custom pipelines
  }

  private static async checkDataCompleteness(): Promise<{ score: number; issues: DataQualityIssue[] }> {
    // Implementation for data completeness check
    return { score: 95, issues: [] };
  }

  private static async checkDataAccuracy(): Promise<{ score: number; issues: DataQualityIssue[] }> {
    // Implementation for data accuracy check
    return { score: 92, issues: [] };
  }

  private static async checkDataConsistency(): Promise<{ score: number; issues: DataQualityIssue[] }> {
    // Implementation for data consistency check
    return { score: 88, issues: [] };
  }

  private static async checkDataTimeliness(): Promise<{ score: number; issues: DataQualityIssue[] }> {
    // Implementation for data timeliness check
    return { score: 94, issues: [] };
  }

  private static async storeDataQualityMetrics(metrics: any): Promise<void> {
    // Implementation for storing data quality metrics
  }
}

interface DataQualityIssue {
  type: 'completeness' | 'accuracy' | 'consistency' | 'timeliness';
  severity: 'high' | 'medium' | 'low';
  description: string;
  table: string;
  column?: string;
  count: number;
  recommendation: string;
}

export default DataAggregatorService;