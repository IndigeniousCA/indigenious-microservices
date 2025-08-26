/**
 * Swarm Orchestrator
 * Controls and coordinates all hunter agents
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import Bull from 'bull';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import pLimit from 'p-limit';
import { 
  HunterConfig, 
  HunterType,
  HuntingTask,
  TaskType,
  TaskStatus,
  HuntingResult,
  SwarmMetrics,
  DiscoveredBusiness,
  EnrichedBusiness
} from '../../types';
import { createLogger } from '../../utils/logger';
import { TaskDistributor } from './TaskDistributor';
import { ResultAggregator } from './ResultAggregator';
import { GovernmentHunter } from '../hunters/GovernmentHunter';
import { IndigenousOrgHunter } from '../hunters/IndigenousOrgHunter';
import { BusinessValidator } from '../validators/BusinessValidator';
import { VerificationEnricher } from '../enrichers/VerificationEnricher';
import { config } from '../../config';

export interface SwarmConfig {
  hunters: {
    government: number;
    indigenousOrg: number;
    socialMedia: number;
    registry: number;
    supplyChain: number;
  };
  concurrency: {
    huntersPerType: number;
    enrichersPerHunter: number;
    validatorsPerHunter: number;
  };
  targets: {
    total: number;
    indigenous: number;
    dailyRate: number;
  };
  redis: Redis;
  queues: {
    hunting: Bull.Queue;
    validation: Bull.Queue;
    enrichment: Bull.Queue;
    export: Bull.Queue;
  };
}

export class SwarmOrchestrator extends EventEmitter {
  private readonly config: SwarmConfig;
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly taskDistributor: TaskDistributor;
  private readonly resultAggregator: ResultAggregator;
  private readonly hunters: Map<string, any> = new Map();
  private readonly validators: Map<string, BusinessValidator> = new Map();
  private readonly enrichers: Map<string, VerificationEnricher> = new Map();
  private readonly workers: Worker[] = [];
  private isRunning: boolean = false;
  private metrics: SwarmMetrics;
  
  constructor(config: SwarmConfig) {
    super();
    this.config = config;
    this.redis = config.redis;
    this.logger = createLogger('swarm:orchestrator');
    
    this.taskDistributor = new TaskDistributor(config.queues, this.redis);
    this.resultAggregator = new ResultAggregator(this.redis);
    
    this.metrics = {
      hunters: { active: 0, idle: 0, failed: 0 },
      discovery: { total: 0, lastHour: 0, lastDay: 0, rate: 0 },
      quality: { verificationRate: 0, indigenousRate: 0, enrichmentRate: 0, errorRate: 0 },
      performance: { avgTaskDuration: 0, tasksPerHour: 0, queueDepth: 0, cpuUsage: 0, memoryUsage: 0 }
    };
    
    this.setupEventHandlers();
    this.startMetricsCollection();
  }
  
  /**
   * Initialize and start the swarm
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Swarm is already running');
    }
    
    this.logger.info('Starting Business Hunter Swarm', {
      hunters: this.config.hunters,
      targets: this.config.targets
    });
    
    try {
      // Initialize hunters
      await this.initializeHunters();
      
      // Initialize validators and enrichers
      await this.initializeProcessors();
      
      // Setup queue processors
      await this.setupQueueProcessors();
      
      // Load initial hunting tasks
      await this.loadInitialTasks();
      
      // Start task distribution
      await this.taskDistributor.start();
      
      // Start result aggregation
      await this.resultAggregator.start();
      
      this.isRunning = true;
      this.emit('started', { timestamp: new Date() });
      
      this.logger.info('Swarm started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start swarm:', error);
      await this.stop();
      throw error;
    }
  }
  
  /**
   * Stop the swarm gracefully
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping swarm...');
    
    this.isRunning = false;
    
    // Stop task distribution
    await this.taskDistributor.stop();
    
    // Stop result aggregation
    await this.resultAggregator.stop();
    
    // Cleanup hunters
    for (const [id, hunter] of this.hunters) {
      await hunter.cleanup();
    }
    
    // Terminate workers
    for (const worker of this.workers) {
      await worker.terminate();
    }
    
    this.hunters.clear();
    this.validators.clear();
    this.enrichers.clear();
    this.workers.length = 0;
    
    this.emit('stopped', { timestamp: new Date() });
    this.logger.info('Swarm stopped');
  }
  
  /**
   * Initialize hunter agents
   */
  private async initializeHunters(): Promise<void> {
    const hunterConfigs: HunterConfig[] = [];
    
    // Create government hunters
    for (let i = 0; i < this.config.hunters.government; i++) {
      const config: HunterConfig = {
        id: `gov-hunter-${i}`,
        type: HunterType.GOVERNMENT,
        sources: [], // Will be populated by hunter
        rateLimit: 60, // requests per minute
        priority: 8,
        enabled: true
      };
      hunterConfigs.push(config);
      
      const hunter = new GovernmentHunter(config, this.redis);
      this.setupHunterEvents(hunter);
      this.hunters.set(config.id, hunter);
    }
    
    // Create Indigenous org hunters
    for (let i = 0; i < this.config.hunters.indigenousOrg; i++) {
      const config: HunterConfig = {
        id: `indigenous-hunter-${i}`,
        type: HunterType.INDIGENOUS_ORG,
        sources: [],
        rateLimit: 30, // More respectful rate limit
        priority: 10, // Highest priority
        enabled: true
      };
      hunterConfigs.push(config);
      
      const hunter = new IndigenousOrgHunter(config, this.redis);
      this.setupHunterEvents(hunter);
      this.hunters.set(config.id, hunter);
    }
    
    // TODO: Add other hunter types (social media, registry, supply chain)
    
    this.logger.info(`Initialized ${this.hunters.size} hunters`);
  }
  
  /**
   * Initialize validators and enrichers
   */
  private async initializeProcessors(): Promise<void> {
    const validatorCount = Math.ceil(this.hunters.size * this.config.concurrency.validatorsPerHunter);
    const enricherCount = Math.ceil(this.hunters.size * this.config.concurrency.enrichersPerHunter);
    
    // Create validators
    for (let i = 0; i < validatorCount; i++) {
      const validator = new BusinessValidator(this.redis);
      this.validators.set(`validator-${i}`, validator);
    }
    
    // Create enrichers
    for (let i = 0; i < enricherCount; i++) {
      const enricher = new VerificationEnricher(this.redis);
      this.enrichers.set(`enricher-${i}`, enricher);
    }
    
    this.logger.info(`Initialized ${validatorCount} validators and ${enricherCount} enrichers`);
  }
  
  /**
   * Setup queue processors
   */
  private async setupQueueProcessors(): Promise<void> {
    const { queues } = this.config;
    
    // Process hunting tasks
    queues.hunting.process('discover', this.config.concurrency.huntersPerType, async (job) => {
      const task: HuntingTask = job.data;
      const hunter = this.hunters.get(task.hunterId);
      
      if (!hunter) {
        throw new Error(`Hunter ${task.hunterId} not found`);
      }
      
      this.metrics.hunters.active++;
      const result = await hunter.hunt(task.source, task.payload);
      this.metrics.hunters.active--;
      
      // Queue discovered businesses for validation
      for (const business of result.businesses) {
        await queues.validation.add('validate', {
          business,
          source: task.source,
          hunterId: task.hunterId
        });
      }
      
      return result;
    });
    
    // Process validation tasks
    queues.validation.process('validate', this.config.concurrency.validatorsPerHunter, async (job) => {
      const { business } = job.data;
      const validator = Array.from(this.validators.values())[0]; // Round-robin in production
      
      const isValid = await validator.validate(business);
      
      if (isValid) {
        // Queue for enrichment
        await queues.enrichment.add('enrich', {
          business,
          validated: true
        });
      }
      
      return { valid: isValid };
    });
    
    // Process enrichment tasks
    queues.enrichment.process('enrich', this.config.concurrency.enrichersPerHunter, async (job) => {
      const { business } = job.data;
      const enricher = Array.from(this.enrichers.values())[0]; // Round-robin in production
      
      const enrichedBusiness = await enricher.enrich(business);
      
      // Store in database
      await this.resultAggregator.addBusiness(enrichedBusiness);
      
      // Queue for export if ready
      if (this.shouldExport()) {
        await queues.export.add('export-batch', {
          timestamp: new Date()
        });
      }
      
      return enrichedBusiness;
    });
    
    // Process export tasks
    queues.export.process('export-batch', async (job) => {
      const batch = await this.resultAggregator.getExportBatch(1000);
      
      // Send to main platform
      await this.exportToMainPlatform(batch);
      
      return { exported: batch.length };
    });
  }
  
  /**
   * Load initial hunting tasks
   */
  private async loadInitialTasks(): Promise<void> {
    const tasks: HuntingTask[] = [];
    
    // Distribute sources among hunters
    for (const [hunterId, hunter] of this.hunters) {
      const hunterSources = hunter.config.sources;
      const sourcesPerBatch = Math.ceil(hunterSources.length / 10);
      
      for (let i = 0; i < hunterSources.length; i += sourcesPerBatch) {
        const batchSources = hunterSources.slice(i, i + sourcesPerBatch);
        
        for (const source of batchSources) {
          tasks.push({
            id: `task-${Date.now()}-${Math.random()}`,
            hunterId,
            source,
            type: TaskType.DISCOVER,
            priority: hunter.config.priority,
            payload: {},
            attempts: 0,
            status: TaskStatus.PENDING,
            createdAt: new Date()
          });
        }
      }
    }
    
    // Add tasks to queue
    await this.taskDistributor.distributeTasks(tasks);
    
    this.logger.info(`Loaded ${tasks.length} initial hunting tasks`);
  }
  
  /**
   * Setup hunter event handlers
   */
  private setupHunterEvents(hunter: any): void {
    hunter.on('progress', (progress: any) => {
      this.emit('hunter:progress', progress);
      this.updateMetrics('discovery', progress);
    });
    
    hunter.on('complete', (result: HuntingResult) => {
      this.emit('hunter:complete', result);
      this.metrics.discovery.total += result.businesses.length;
    });
    
    hunter.on('error', (error: any) => {
      this.logger.error(`Hunter ${hunter.id} error:`, error);
      this.metrics.hunters.failed++;
    });
  }
  
  /**
   * Export batch to main platform
   */
  private async exportToMainPlatform(businesses: EnrichedBusiness[]): Promise<void> {
    try {
      const webhook = process.env.MAIN_PLATFORM_WEBHOOK || config.platform.webhookUrl;
      const apiKey = process.env.MAIN_PLATFORM_API_KEY || config.platform.apiKey;
      
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Source': 'business-hunter-swarm',
          'X-Batch-Size': businesses.length.toString()
        },
        body: JSON.stringify({
          businesses,
          source: 'hunter_swarm',
          timestamp: new Date(),
          metrics: this.metrics
        })
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      this.logger.info(`Exported ${businesses.length} businesses to main platform`);
      
    } catch (error) {
      this.logger.error('Failed to export to main platform:', error);
      throw error;
    }
  }
  
  /**
   * Check if we should trigger an export
   */
  private shouldExport(): boolean {
    // Export every 1000 businesses or every hour
    const pendingCount = this.resultAggregator.getPendingCount();
    const lastExport = this.resultAggregator.getLastExportTime();
    const hoursSinceExport = (Date.now() - lastExport) / (1000 * 60 * 60);
    
    return pendingCount >= 1000 || hoursSinceExport >= 1;
  }
  
  /**
   * Update swarm metrics
   */
  private updateMetrics(type: string, data: any): void {
    // Update specific metrics based on type
    switch (type) {
      case 'discovery':
        this.metrics.discovery.lastHour += data.discovered || 0;
        break;
      case 'validation':
        this.metrics.quality.verificationRate = data.rate || this.metrics.quality.verificationRate;
        break;
      case 'enrichment':
        this.metrics.quality.enrichmentRate = data.rate || this.metrics.quality.enrichmentRate;
        break;
    }
    
    // Calculate rates
    this.metrics.discovery.rate = this.metrics.discovery.lastHour;
    this.metrics.performance.tasksPerHour = this.taskDistributor.getProcessingRate();
    this.metrics.performance.queueDepth = this.taskDistributor.getQueueDepth();
    
    // System metrics
    const usage = process.cpuUsage();
    this.metrics.performance.cpuUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
    this.metrics.performance.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    // Store in Redis
    this.redis.hset('swarm:metrics', {
      ...this.metrics,
      timestamp: Date.now()
    });
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
      this.emit('metrics', this.metrics);
    }, 60000);
    
    // Reset hourly counters
    setInterval(() => {
      this.metrics.discovery.lastHour = 0;
    }, 3600000);
    
    // Reset daily counters
    setInterval(() => {
      this.metrics.discovery.lastDay = 0;
    }, 86400000);
  }
  
  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    // Get queue metrics
    const queues = this.config.queues;
    const [huntingInfo, validationInfo, enrichmentInfo] = await Promise.all([
      queues.hunting.getJobCounts(),
      queues.validation.getJobCounts(),
      queues.enrichment.getJobCounts()
    ]);
    
    // Update queue depth
    this.metrics.performance.queueDepth = 
      huntingInfo.waiting + validationInfo.waiting + enrichmentInfo.waiting;
    
    // Calculate quality metrics
    const stats = await this.resultAggregator.getStats();
    this.metrics.quality.verificationRate = stats.verifiedCount / stats.totalCount || 0;
    this.metrics.quality.indigenousRate = stats.indigenousCount / stats.totalCount || 0;
    this.metrics.quality.enrichmentRate = stats.enrichedCount / stats.totalCount || 0;
    this.metrics.quality.errorRate = 
      (huntingInfo.failed + validationInfo.failed + enrichmentInfo.failed) / 
      (huntingInfo.completed + validationInfo.completed + enrichmentInfo.completed) || 0;
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('error', (error) => {
      this.logger.error('Swarm error:', error);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      this.logger.info('Received SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      this.logger.info('Received SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
  }
  
  /**
   * Get current swarm status
   */
  getStatus(): any {
    return {
      running: this.isRunning,
      hunters: {
        total: this.hunters.size,
        active: this.metrics.hunters.active,
        failed: this.metrics.hunters.failed
      },
      discovered: this.metrics.discovery.total,
      rate: this.metrics.discovery.rate,
      queues: {
        hunting: this.config.queues.hunting.name,
        validation: this.config.queues.validation.name,
        enrichment: this.config.queues.enrichment.name,
        export: this.config.queues.export.name
      },
      metrics: this.metrics
    };
  }
}