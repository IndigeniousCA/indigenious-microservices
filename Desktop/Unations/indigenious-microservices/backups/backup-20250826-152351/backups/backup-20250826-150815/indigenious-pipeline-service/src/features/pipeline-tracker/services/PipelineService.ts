// Pipeline Tracking Service
import { 
  Pipeline, PipelineStage, Opportunity, Activity,
  PipelineMetrics, ForecastData, VelocityMetric,
  StageMetrics, TeamPerformance, PipelineAlert,
  OpportunityTemplate, BulkAction, PipelineSnapshot
} from '../types'

import { logger } from '@/lib/monitoring/logger';
export class PipelineService {
  // Default pipeline stages for government RFQs
  private defaultStages: PipelineStage[] = [
    {
      id: 'discovery',
      name: 'Discovery',
      order: 1,
      color: '#6B7280',
      description: 'Initial opportunity identification',
      averageDuration: 7,
      conversionRate: 80
    },
    {
      id: 'qualification',
      name: 'Qualification',
      order: 2,
      color: '#3B82F6',
      description: 'Assessing fit and requirements',
      averageDuration: 5,
      conversionRate: 70
    },
    {
      id: 'proposal',
      name: 'Proposal',
      order: 3,
      color: '#8B5CF6',
      description: 'Preparing and writing bid',
      averageDuration: 14,
      conversionRate: 60
    },
    {
      id: 'review',
      name: 'Review',
      order: 4,
      color: '#F59E0B',
      description: 'Internal review and refinement',
      averageDuration: 3,
      conversionRate: 90
    },
    {
      id: 'submitted',
      name: 'Submitted',
      order: 5,
      color: '#10B981',
      description: 'Bid submitted, awaiting decision',
      averageDuration: 30,
      conversionRate: 40
    },
    {
      id: 'negotiation',
      name: 'Negotiation',
      order: 6,
      color: '#EF4444',
      description: 'Contract negotiation phase',
      averageDuration: 14,
      conversionRate: 85
    },
    {
      id: 'closed',
      name: 'Closed',
      order: 7,
      color: '#059669',
      description: 'Won or lost',
      averageDuration: 0,
      conversionRate: 0
    }
  ]

  // Create or get pipeline
  async getPipeline(businessId: string): Promise<Pipeline> {
    // In production, fetch from database
    const mockOpportunities: Opportunity[] = [
      {
        id: 'opp-1',
        rfqId: 'rfq-2024-001',
        title: 'IT Infrastructure Modernization',
        client: 'Public Works Canada',
        value: 500000,
        probability: 75,
        stage: 'proposal',
        status: 'active',
        priority: 'high',
        assignedTo: ['user-1', 'user-2'],
        tags: ['it', 'infrastructure', 'federal'],
        dates: {
          created: new Date('2024-01-10'),
          deadline: new Date('2024-02-15'),
          lastActivity: new Date(),
          stageEntered: new Date('2024-01-20'),
          expectedClose: new Date('2024-03-01')
        },
        activities: [],
        notes: 'Strong technical fit, need to emphasize Indigenous benefits',
        score: 85,
        nextAction: {
          action: 'Complete technical section',
          dueDate: new Date('2024-02-10'),
          assignedTo: 'user-1',
          priority: 'urgent',
          completed: false
        }
      },
      {
        id: 'opp-2',
        title: 'Security Assessment Services',
        client: 'Department of Defense',
        value: 750000,
        probability: 60,
        stage: 'qualification',
        status: 'active',
        priority: 'critical',
        assignedTo: ['user-1'],
        tags: ['security', 'assessment', 'defense'],
        dates: {
          created: new Date('2024-01-15'),
          deadline: new Date('2024-02-28'),
          lastActivity: new Date(),
          stageEntered: new Date('2024-01-18')
        },
        activities: [],
        notes: 'Need security clearance verification',
        blockers: [
          {
            id: 'block-1',
            issue: 'Team member security clearance pending',
            severity: 'major',
            dateIdentified: new Date('2024-01-20'),
            assignedTo: 'user-2'
          }
        ]
      },
      {
        id: 'opp-3',
        title: 'Cloud Migration Project',
        client: 'Health Canada',
        value: 320000,
        probability: 90,
        stage: 'review',
        status: 'active',
        priority: 'medium',
        assignedTo: ['user-2', 'user-3'],
        tags: ['cloud', 'migration', 'healthcare'],
        dates: {
          created: new Date('2024-01-05'),
          deadline: new Date('2024-02-20'),
          lastActivity: new Date(),
          stageEntered: new Date('2024-01-25'),
          expectedClose: new Date('2024-02-25')
        },
        activities: [],
        notes: 'Final review pending, strong position'
      },
      {
        id: 'opp-4',
        title: 'Indigenous Portal Development',
        client: 'Indigenous Services Canada',
        value: 450000,
        probability: 40,
        stage: 'submitted',
        status: 'active',
        priority: 'high',
        assignedTo: ['user-1'],
        tags: ['development', 'portal', 'indigenous'],
        dates: {
          created: new Date('2023-12-15'),
          deadline: new Date('2024-01-30'),
          lastActivity: new Date('2024-01-30'),
          stageEntered: new Date('2024-01-30')
        },
        activities: [],
        notes: 'Awaiting evaluation results'
      },
      {
        id: 'opp-5',
        title: 'Network Security Upgrade',
        client: 'Transport Canada',
        value: 280000,
        probability: 0,
        stage: 'closed',
        status: 'won',
        priority: 'low',
        assignedTo: ['user-2'],
        tags: ['security', 'network', 'transport'],
        dates: {
          created: new Date('2023-11-01'),
          lastActivity: new Date('2024-01-15'),
          stageEntered: new Date('2024-01-15')
        },
        activities: [],
        notes: 'Contract signed, project starting Feb 1'
      }
    ]

    const metrics = this.calculateMetrics(mockOpportunities)

    return {
      id: `pipeline-${businessId}`,
      businessId,
      name: 'Main Sales Pipeline',
      description: 'Government RFQ opportunities',
      createdDate: new Date('2023-01-01'),
      lastUpdated: new Date(),
      stages: this.defaultStages,
      opportunities: mockOpportunities,
      metrics,
      settings: {
        defaultStages: this.defaultStages.map(s => s.id),
        probabilityCalculation: 'hybrid',
        staleOpportunityDays: 30,
        warningThresholds: {
          daysInStage: 14,
          daysToDeadline: 7,
          inactivityDays: 7
        },
        automationEnabled: true,
        collaborationEnabled: true
      }
    }
  }

  // Calculate pipeline metrics
  private calculateMetrics(opportunities: Opportunity[]): PipelineMetrics {
    const activeOpps = opportunities.filter(o => o.status === 'active')
    const wonOpps = opportunities.filter(o => o.status === 'won')
    const totalOpps = opportunities.length

    const totalValue = activeOpps.reduce((sum, o) => sum + o.value, 0)
    const weightedValue = activeOpps.reduce((sum, o) => sum + (o.value * o.probability / 100), 0)
    const averageValue = totalOpps > 0 ? totalValue / activeOpps.length : 0
    const winRate = totalOpps > 0 ? (wonOpps.length / opportunities.filter(o => o.status === 'won' || o.status === 'lost').length) * 100 : 0

    // Calculate stage conversion rates
    const stageConversion: Record<string, number> = {}
    this.defaultStages.forEach((stage, index) => {
      if (index < this.defaultStages.length - 1) {
        const inStage = opportunities.filter(o => o.stage === stage.id).length
        const nextStage = this.defaultStages[index + 1]
        const inNextStage = opportunities.filter(o => 
          this.defaultStages.findIndex(s => s.id === o.stage) > index
        ).length
        stageConversion[stage.id] = inStage > 0 ? (inNextStage / inStage) * 100 : 0
      }
    })

    return {
      totalOpportunities: activeOpps.length,
      totalValue,
      weightedValue,
      averageValue,
      winRate,
      averageCycleTime: 45, // Mock value
      stageConversion,
      velocityTrend: 'stable',
      healthScore: 78
    }
  }

  // Move opportunity to different stage
  async moveOpportunity(
    opportunityId: string,
    newStage: string,
    userId: string
  ): Promise<Opportunity> {
    // In production, update database
    const activity: Activity = {
      id: `activity-${Date.now()}`,
      type: 'status-change',
      title: `Moved to ${newStage}`,
      timestamp: new Date(),
      userId,
      userName: 'Current User',
      metadata: { previousStage: 'proposal', newStage }
    }

    // Return updated opportunity
    return {} as Opportunity
  }

  // Get pipeline forecast
  async getForecast(
    businessId: string,
    periods: number = 6
  ): Promise<ForecastData[]> {
    const forecast: ForecastData[] = []
    const today = new Date()

    for (let i = 0; i < periods; i++) {
      const periodStart = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const periodName = periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      // Mock forecast data
      const baseValue = 400000 + (i * 50000)
      forecast.push({
        period: periodName,
        projected: baseValue + Math.random() * 100000,
        committed: baseValue * 0.7,
        bestCase: baseValue * 1.3,
        worstCase: baseValue * 0.5,
        closed: i === 0 ? baseValue * 0.3 : 0,
        target: baseValue
      })
    }

    return forecast
  }

  // Get velocity metrics
  async getVelocityMetrics(
    businessId: string,
    periods: number = 12
  ): Promise<VelocityMetric[]> {
    const metrics: VelocityMetric[] = []
    const today = new Date()

    for (let i = periods - 1; i >= 0; i--) {
      const periodStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const periodName = periodStart.toLocaleDateString('en-US', { month: 'short' })
      
      metrics.push({
        period: periodName,
        created: Math.floor(Math.random() * 10) + 5,
        progressed: Math.floor(Math.random() * 8) + 3,
        won: Math.floor(Math.random() * 5),
        lost: Math.floor(Math.random() * 3),
        cycleTime: Math.floor(Math.random() * 20) + 30
      })
    }

    return metrics
  }

  // Get stage-specific metrics
  async getStageMetrics(businessId: string): Promise<StageMetrics[]> {
    return this.defaultStages.map(stage => ({
      stageName: stage.name,
      count: Math.floor(Math.random() * 10) + 1,
      value: Math.floor(Math.random() * 1000000) + 100000,
      averageTime: stage.averageDuration || 0,
      conversionRate: stage.conversionRate || 0,
      bottlenecks: stage.name === 'proposal' ? ['Waiting for technical review', 'Pricing approval'] : []
    }))
  }

  // Get team performance
  async getTeamPerformance(businessId: string): Promise<TeamPerformance[]> {
    return [
      {
        userId: 'user-1',
        userName: 'Sarah Mitchell',
        metrics: {
          opportunities: 15,
          value: 2500000,
          winRate: 45,
          averageDealSize: 166667,
          activitiesPerWeek: 23,
          responseTime: 2.5
        },
        trends: {
          winRate: 'improving',
          activity: 'stable'
        }
      },
      {
        userId: 'user-2',
        userName: 'James Wilson',
        metrics: {
          opportunities: 12,
          value: 1800000,
          winRate: 38,
          averageDealSize: 150000,
          activitiesPerWeek: 18,
          responseTime: 3.2
        },
        trends: {
          winRate: 'stable',
          activity: 'increasing'
        }
      }
    ]
  }

  // Get pipeline alerts
  async getAlerts(businessId: string): Promise<PipelineAlert[]> {
    return [
      {
        id: 'alert-1',
        type: 'deadline',
        severity: 'critical',
        title: 'IT Infrastructure Modernization deadline in 5 days',
        description: 'Proposal must be submitted by Feb 15',
        opportunityId: 'opp-1',
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: 'Complete and submit proposal'
      },
      {
        id: 'alert-2',
        type: 'stalled',
        severity: 'warning',
        title: 'Security Assessment stuck in Qualification',
        description: 'No activity for 7 days',
        opportunityId: 'opp-2',
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: 'Follow up on security clearance'
      },
      {
        id: 'alert-3',
        type: 'at-risk',
        severity: 'warning',
        title: 'Low win probability on high-value opportunity',
        description: 'Indigenous Portal Development has 40% probability',
        opportunityId: 'opp-4',
        timestamp: new Date(),
        acknowledged: true
      }
    ]
  }

  // Create opportunity from template
  async createOpportunityFromTemplate(
    templateId: string,
    data: Partial<Opportunity>
  ): Promise<Opportunity> {
    const template = this.getTemplate(templateId)
    
    return {
      id: `opp-${Date.now()}`,
      title: data.title || template.defaultValues.title || '',
      client: data.client || template.defaultValues.client || '',
      value: data.value || template.defaultValues.value || 0,
      probability: 50,
      stage: template.stages[0],
      status: 'active',
      priority: 'medium',
      assignedTo: [],
      tags: template.defaultValues.tags || [],
      dates: {
        created: new Date(),
        lastActivity: new Date(),
        stageEntered: new Date()
      },
      activities: [],
      notes: '',
      ...data
    }
  }

  // Bulk update opportunities
  async bulkUpdate(action: BulkAction): Promise<void> {
    // In production, update multiple opportunities
    logger.info('Bulk updating:', action)
  }

  // Take pipeline snapshot
  async takeSnapshot(businessId: string): Promise<PipelineSnapshot> {
    const pipeline = await this.getPipeline(businessId)
    const stageDistribution: Record<string, number> = {}
    
    this.defaultStages.forEach(stage => {
      stageDistribution[stage.id] = pipeline.opportunities.filter(o => o.stage === stage.id).length
    })

    return {
      id: `snapshot-${Date.now()}`,
      date: new Date(),
      metrics: pipeline.metrics,
      stageDistribution,
      topOpportunities: pipeline.opportunities
        .filter(o => o.status === 'active')
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    }
  }

  private getTemplate(templateId: string): OpportunityTemplate {
    // Mock template
    return {
      id: templateId,
      name: 'Government RFQ',
      category: 'government',
      stages: this.defaultStages.map(s => s.id),
      defaultValues: {
        priority: 'medium',
        tags: ['government', 'rfq']
      },
      requiredFields: ['title', 'client', 'value', 'deadline'],
      customFields: []
    }
  }
}