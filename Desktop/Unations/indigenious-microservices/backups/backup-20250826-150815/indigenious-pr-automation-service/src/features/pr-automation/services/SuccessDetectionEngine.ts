/**
 * Success Detection Engine
 * Automatically identifies PR-worthy achievements across the platform
 * Converts platform events into compelling stories
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import { AIIntelligenceService } from '@/features/ai-intelligence/services/AIIntelligenceService';
import { PRContentGenerator } from './PRContentGenerator';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import type { SuccessStory, PRAutomationRule } from '../types';

interface DetectionCriteria {
  contractValue?: { min: number };
  jobsCreated?: { min: number };
  communityImpact?: boolean;
  firstTimeWinner?: boolean;
  indigenous?: boolean;
  mediaWorthy?: boolean;
}

export class SuccessDetectionEngine extends EventEmitter {
  private static instance: SuccessDetectionEngine;
  private aiService = new AIIntelligenceService();
  private contentGenerator = PRContentGenerator.getInstance();
  
  // Detection rules
  private detectionRules: PRAutomationRule[] = [
    {
      id: 'large-contract-win',
      name: 'Large Contract Win Detection',
      active: true,
      trigger: {
        type: 'event',
        conditions: [
          { field: 'event.type', operator: 'equals', value: 'contract.awarded' },
          { field: 'event.value', operator: 'greater', value: 1000000 }
        ]
      },
      actions: [
        { type: 'generate_content', parameters: { template: 'contract_win' } },
        { type: 'create_story', parameters: { priority: 'high' } }
      ],
      filters: {
        minValue: 1000000,
        businessType: ['indigenous']
      },
      performance: {
        triggerCount: 0,
        successRate: 0,
        avgEngagement: 0
      }
    },
    {
      id: 'first-time-winner',
      name: 'First Time Winner Detection',
      active: true,
      trigger: {
        type: 'event',
        conditions: [
          { field: 'event.type', operator: 'equals', value: 'contract.awarded' },
          { field: 'business.contractsWon', operator: 'equals', value: 1 }
        ]
      },
      actions: [
        { type: 'generate_content', parameters: { template: 'first_win' } },
        { type: 'alert_team', parameters: { urgency: 'medium' } }
      ],
      filters: {},
      performance: {
        triggerCount: 0,
        successRate: 0,
        avgEngagement: 0
      }
    },
    {
      id: 'job-creation-milestone',
      name: 'Significant Job Creation',
      active: true,
      trigger: {
        type: 'metric',
        conditions: [
          { field: 'jobs.created', operator: 'greater', value: 50 },
          { field: 'jobs.indigenous', operator: 'greater', value: 25 }
        ]
      },
      actions: [
        { type: 'generate_content', parameters: { template: 'job_creation' } },
        { type: 'send_campaign', parameters: { channels: ['media', 'social'] } }
      ],
      filters: {
        cooldown: 168 // 1 week between similar stories
      },
      performance: {
        triggerCount: 0,
        successRate: 0,
        avgEngagement: 0
      }
    },
    {
      id: 'platform-milestone',
      name: 'Platform Milestone Achievement',
      active: true,
      trigger: {
        type: 'metric',
        conditions: [
          { field: 'platform.totalContracts', operator: 'equals', value: 1000 }
        ]
      },
      actions: [
        { type: 'generate_content', parameters: { template: 'milestone' } },
        { type: 'send_campaign', parameters: { priority: 'urgent' } }
      ],
      filters: {},
      performance: {
        triggerCount: 0,
        successRate: 0,
        avgEngagement: 0
      }
    },
    {
      id: 'partnership-formed',
      name: 'Strategic Partnership Detection',
      active: true,
      trigger: {
        type: 'event',
        conditions: [
          { field: 'event.type', operator: 'equals', value: 'partnership.created' },
          { field: 'partnership.type', operator: 'equals', value: 'strategic' }
        ]
      },
      actions: [
        { type: 'generate_content', parameters: { template: 'partnership' } },
        { type: 'create_story', parameters: { embargo: true } }
      ],
      filters: {
        businessType: ['indigenous', 'government']
      },
      performance: {
        triggerCount: 0,
        successRate: 0,
        avgEngagement: 0
      }
    }
  ];
  
  // Event patterns to monitor
  private eventPatterns = {
    'contract.awarded': this.detectContractWin.bind(this),
    'milestone.completed': this.detectMilestoneCompletion.bind(this),
    'partnership.created': this.detectPartnership.bind(this),
    'community.impact': this.detectCommunityImpact.bind(this),
    'innovation.deployed': this.detectInnovation.bind(this)
  };
  
  private constructor() {
    super();
    this.initializeDetection();
  }
  
  static getInstance(): SuccessDetectionEngine {
    if (!this.instance) {
      this.instance = new SuccessDetectionEngine();
    }
    return this.instance;
  }
  
  /**
   * Process platform event for success detection
   */
  async processEvent(event: {
    type: string;
    data: unknown;
    timestamp: Date;
  }): Promise<{
    detected: boolean;
    story?: SuccessStory;
    actions?: string[];
  }> {
    // Check if event matches any detection rules
    const matchingRules = this.findMatchingRules(event);
    
    if (matchingRules.length === 0) {
      return { detected: false };
    }
    
    // Process the highest priority rule
    const primaryRule = matchingRules[0];
    
    // Check if we should suppress (cooldown period)
    if (await this.shouldSuppress(primaryRule, event)) {
      return { detected: false };
    }
    
    // Evaluate if truly newsworthy
    const newsWorthiness = await this.evaluateNewsWorthiness(event);
    
    if (newsWorthiness.score < 0.6) {
      return { detected: false };
    }
    
    // Generate success story
    const story = await this.generateSuccessStory(event, newsWorthiness);
    
    // Execute rule actions
    const actions = await this.executeRuleActions(primaryRule, story);
    
    // Update rule performance
    await this.updateRulePerformance(primaryRule, true);
    
    // Emit event for other systems
    this.emit('success-detected', { story, actions });
    
    // Log detection
    await indigenousLedger.log(
      'pr.success.detected',
      'info',
      'Success story detected',
      {
        eventType: event.type,
        storyId: story.id,
        newsWorthiness: newsWorthiness.score
      }
    );
    
    return { detected: true, story, actions };
  }
  
  /**
   * Scan platform data for missed successes
   */
  async scanForSuccesses(
    timeframe: { start: Date; end: Date }
  ): Promise<SuccessStory[]> {
    const stories: SuccessStory[] = [];
    
    // Scan contracts
    const contracts = await prisma.contract.findMany({
      where: {
        awardedAt: { gte: timeframe.start, lte: timeframe.end },
        value: { gte: 500000 } // Focus on significant contracts
      },
      include: {
        business: true,
        rfq: true
      }
    });
    
    for (const contract of contracts) {
      const event = {
        type: 'contract.awarded',
        data: contract,
        timestamp: contract.awardedAt
      };
      
      const result = await this.processEvent(event);
      if (result.story) {
        stories.push(result.story);
      }
    }
    
    // Scan milestones
    const milestones = await prisma.milestone.findMany({
      where: {
        completedAt: { gte: timeframe.start, lte: timeframe.end },
        type: { in: ['major', 'final'] }
      },
      include: {
        project: { include: { business: true } }
      }
    });
    
    for (const milestone of milestones) {
      const event = {
        type: 'milestone.completed',
        data: milestone,
        timestamp: milestone.completedAt!
      };
      
      const result = await this.processEvent(event);
      if (result.story) {
        stories.push(result.story);
      }
    }
    
    return stories;
  }
  
  /**
   * Set up custom detection rule
   */
  async addCustomRule(rule: PRAutomationRule): Promise<void> {
    // Validate rule
    if (!this.validateRule(rule)) {
      throw new Error('Invalid rule configuration');
    }
    
    // Add to rules
    this.detectionRules.push(rule);
    
    // Persist rule
    await prisma.prAutomationRule.create({
      data: rule as unknown
    });
  }
  
  /**
   * Get detection performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    totalDetections: number;
    byType: Record<string, number>;
    conversionRate: number;
    topPerformingRules: PRAutomationRule[];
  }> {
    const metrics = await prisma.successStory.groupBy({
      by: ['type'],
      _count: true
    });
    
    const totalDetections = metrics.reduce((sum, m) => sum + m._count, 0);
    
    const byType = metrics.reduce((acc, m) => {
      acc[m.type] = m._count;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate conversion rate (stories that led to media pickup)
    const mediaPickups = await prisma.successStory.count({
      where: {
        usage: {
          mediaPickup: { isEmpty: false }
        }
      }
    });
    
    const conversionRate = totalDetections > 0 
      ? mediaPickups / totalDetections 
      : 0;
    
    // Get top performing rules
    const topPerformingRules = [...this.detectionRules]
      .sort((a, b) => b.performance.successRate - a.performance.successRate)
      .slice(0, 5);
    
    return {
      totalDetections,
      byType,
      conversionRate,
      topPerformingRules
    };
  }
  
  /**
   * Private helper methods
   */
  private initializeDetection(): void {
    // Set up event listeners for platform events
    this.subscribeToEvents();
    
    // Start periodic scanning
    setInterval(() => {
      const end = new Date();
      const start = new Date(end.getTime() - 3600000); // Last hour
      this.scanForSuccesses({ start, end }).catch((error) => logger.error('Success scanning error:', error));
    }, 3600000); // Every hour
  }
  
  private subscribeToEvents(): void {
    // In production, would subscribe to event bus
    // For now, using manual event processing
  }
  
  private findMatchingRules(event: unknown): PRAutomationRule[] {
    return this.detectionRules.filter(rule => {
      if (!rule.active) return false;
      
      // Check all conditions
      return rule.trigger.conditions.every(condition => {
        const value = this.getNestedValue(event, condition.field);
        
        switch (condition.operator) {
          case 'equals':
            return value === condition.value;
          case 'greater':
            return value > condition.value;
          case 'less':
            return value < condition.value;
          case 'contains':
            return String(value).includes(condition.value);
          default:
            return false;
        }
      });
    });
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private async shouldSuppress(rule: PRAutomationRule, event: any): Promise<boolean> {
    if (!rule.filters.cooldown) return false;
    
    // Check if similar story was published recently
    const cooldownEnd = new Date(Date.now() - rule.filters.cooldown * 3600000);
    
    const recentSimilar = await prisma.successStory.findFirst({
      where: {
        type: event.type,
        createdAt: { gte: cooldownEnd }
      }
    });
    
    return !!recentSimilar;
  }
  
  private async evaluateNewsWorthiness(event: unknown): Promise<{
    score: number;
    factors: Record<string, number>;
  }> {
    const factors: Record<string, number> = {};
    
    // Value/Impact factor
    if (event.data.value) {
      factors.value = Math.min(event.data.value / 10000000, 1); // Normalize to 0-1
    }
    
    // Timing factor (recent is better)
    const hoursSince = (Date.now() - event.timestamp.getTime()) / 3600000;
    factors.timing = Math.max(1 - (hoursSince / 168), 0); // Decay over 1 week
    
    // Uniqueness factor
    factors.uniqueness = await this.calculateUniqueness(event);
    
    // Indigenous factor
    factors.indigenous = event.data.business?.indigenous ? 1 : 0.5;
    
    // Community impact factor
    factors.community = event.data.communityImpact || 0;
    
    // Calculate weighted score
    const weights = {
      value: 0.3,
      timing: 0.2,
      uniqueness: 0.2,
      indigenous: 0.2,
      community: 0.1
    };
    
    const score = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + (value * (weights[key] || 0));
    }, 0);
    
    return { score, factors };
  }
  
  private async calculateUniqueness(event: unknown): Promise<number> {
    // Check how unique this achievement is
    const similar = await prisma.successStory.count({
      where: {
        type: event.type,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600000) } // Last 30 days
      }
    });
    
    return Math.max(1 - (similar / 10), 0);
  }
  
  private async generateSuccessStory(
    event: any,
    newsWorthiness: any
  ): Promise<SuccessStory> {
    return this.contentGenerator.generateSuccessStory({
      type: this.mapEventToStoryType(event.type),
      business: event.data.business || event.data,
      details: {
        ...event.data,
        newsWorthiness
      }
    });
  }
  
  private mapEventToStoryType(eventType: string): SuccessStory['type'] {
    const mapping = {
      'contract.awarded': 'contract_win',
      'partnership.created': 'partnership',
      'milestone.completed': 'milestone',
      'community.impact': 'community_impact',
      'innovation.deployed': 'innovation'
    };
    
    return mapping[eventType] || 'milestone';
  }
  
  private async executeRuleActions(
    rule: PRAutomationRule,
    story: SuccessStory
  ): Promise<string[]> {
    const executedActions = [];
    
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'generate_content':
            await this.contentGenerator.generateCampaignContent(
              'success_story',
              story.details,
              [] // Will be determined by campaign manager
            );
            executedActions.push('content_generated');
            break;
            
          case 'create_story':
            await prisma.successStory.create({
              data: story as unknown
            });
            executedActions.push('story_created');
            break;
            
          case 'alert_team':
            // Send notification to PR team
            executedActions.push('team_alerted');
            break;
            
          case 'send_campaign':
            // Queue campaign for sending
            executedActions.push('campaign_queued');
            break;
        }
      } catch (error) {
        logger.error(`Failed to execute action ${action.type}:`, error);
      }
    }
    
    return executedActions;
  }
  
  private async updateRulePerformance(
    rule: PRAutomationRule,
    success: boolean
  ): Promise<void> {
    rule.performance.triggerCount++;
    if (success) {
      rule.performance.successRate = 
        ((rule.performance.successRate * (rule.performance.triggerCount - 1)) + 1) / 
        rule.performance.triggerCount;
    }
    rule.performance.lastTriggered = new Date();
    
    // Update in database
    await prisma.prAutomationRule.update({
      where: { id: rule.id },
      data: { performance: rule.performance }
    });
  }
  
  private validateRule(rule: PRAutomationRule): boolean {
    // Validate rule structure
    return !!(
      rule.name &&
      rule.trigger &&
      rule.trigger.conditions.length > 0 &&
      rule.actions.length > 0
    );
  }
  
  // Detection methods for specific event types
  private async detectContractWin(event: unknown): Promise<void> {
    // Specific logic for contract wins
  }
  
  private async detectMilestoneCompletion(event: unknown): Promise<void> {
    // Specific logic for milestones
  }
  
  private async detectPartnership(event: unknown): Promise<void> {
    // Specific logic for partnerships
  }
  
  private async detectCommunityImpact(event: unknown): Promise<void> {
    // Specific logic for community impact
  }
  
  private async detectInnovation(event: unknown): Promise<void> {
    // Specific logic for innovation
  }
}

export default SuccessDetectionEngine;