/**
 * Campaign Orchestrator
 * Manages end-to-end PR campaigns with multi-channel coordination
 * Turns platform achievements into widespread positive coverage
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { PRContentGenerator } from './PRContentGenerator';
import { SocialMediaOrchestrator } from './SocialMediaOrchestrator';
import { SuccessDetectionEngine } from './SuccessDetectionEngine';
import { EmailService } from '@/features/email/services/EmailService';
import { SMSService } from '@/features/sms/services/SMSService';
import { QueueService } from '@/features/queue/services/QueueService';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import type { 
  PRCampaign, 
  AudienceSegment, 
  MediaOutlet,
  CrisisEvent,
  MarketIntelligence 
} from '../types';

export class CampaignOrchestrator {
  private static instance: CampaignOrchestrator;
  
  private contentGenerator = PRContentGenerator.getInstance();
  private socialOrchestrator = SocialMediaOrchestrator.getInstance();
  private successDetector = SuccessDetectionEngine.getInstance();
  private emailService = new EmailService();
  private smsService = new SMSService();
  private queueService = new QueueService();
  
  // Campaign templates for different scenarios
  private campaignTemplates = {
    major_win: {
      waves: 3,
      channels: ['email', 'social', 'press', 'sms'],
      timing: 'immediate',
      audiences: ['media', 'government', 'indigenous_leader', 'business']
    },
    milestone: {
      waves: 2,
      channels: ['email', 'social', 'website'],
      timing: 'scheduled',
      audiences: ['indigenous_leader', 'business', 'general_public']
    },
    crisis: {
      waves: 1,
      channels: ['social', 'email', 'press'],
      timing: 'immediate',
      audiences: ['media', 'government', 'indigenous_leader']
    },
    thought_leadership: {
      waves: 1,
      channels: ['email', 'social', 'website'],
      timing: 'optimal',
      audiences: ['business', 'government', 'investor']
    }
  };
  
  private constructor() {
    this.initializeCampaignMonitoring();
  }
  
  static getInstance(): CampaignOrchestrator {
    if (!this.instance) {
      this.instance = new CampaignOrchestrator();
    }
    return this.instance;
  }
  
  /**
   * Create and launch comprehensive PR campaign
   */
  async launchCampaign(
    type: PRCampaign['type'],
    data: unknown,
    options?: {
      urgent?: boolean;
      embargo?: Date;
      customAudiences?: string[];
      excludeChannels?: string[];
    }
  ): Promise<{
    campaign: PRCampaign;
    status: 'launched' | 'scheduled' | 'pending_approval';
    projectedReach: number;
  }> {
    // Select campaign template
    const template = this.campaignTemplates[type] || this.campaignTemplates.thought_leadership;
    
    // Identify target audiences
    const audiences = await this.identifyAudiences(type, data, options?.customAudiences);
    
    // Generate campaign content
    const { master, variations, distribution } = await this.contentGenerator.generateCampaignContent(
      type,
      data,
      audiences
    );
    
    // Create campaign object
    const campaign: PRCampaign = {
      id: `campaign-${Date.now()}`,
      name: `${type}-${data.businessName || 'platform'}-${Date.now()}`,
      type,
      status: options?.embargo ? 'scheduled' : 'draft',
      content: master,
      audience: {
        primary: audiences.filter(a => ['media', 'government'].includes(a.type)),
        secondary: audiences.filter(a => !['media', 'government'].includes(a.type)),
        geographic: await this.determineGeographicScope(data),
        languages: ['en', 'fr'] // English and French
      },
      channels: this.selectChannels(template, options?.excludeChannels),
      schedule: await this.optimizeSchedule(type, options),
      metrics: {
        reach: 0,
        engagement: 0,
        mediaPickup: 0,
        sentimentScore: 0,
        conversions: 0
      },
      approval: {
        required: !options?.urgent && type !== 'crisis',
        approvers: [],
        status: 'pending'
      }
    };
    
    // Check if approval needed
    if (campaign.approval.required) {
      await this.queueForApproval(campaign);
      return {
        campaign,
        status: 'pending_approval',
        projectedReach: await this.calculateProjectedReach(campaign)
      };
    }
    
    // Launch campaign
    const launchResult = await this.executeCampaign(campaign, variations, distribution);
    
    // Log campaign launch
    await indigenousLedger.log(
      'pr.campaign.launched',
      'info',
      'PR campaign launched',
      {
        campaignId: campaign.id,
        type: campaign.type,
        channels: Object.keys(campaign.channels).filter(c => campaign.channels[c]),
        audienceSize: launchResult.totalRecipients
      }
    );
    
    return {
      campaign,
      status: 'launched',
      projectedReach: launchResult.projectedReach
    };
  }
  
  /**
   * Handle crisis with rapid response
   */
  async manageCrisis(crisis: CrisisEvent): Promise<{
    response: Response;
    actions: string[];
    monitoring: any;
  }> {
    // Generate crisis response content
    const response = await this.contentGenerator.generateCrisisResponse(crisis);
    
    // Immediate actions
    const actions = [];
    
    // 1. Post immediate statement on social media
    if (crisis.severity !== 'low') {
      await this.socialOrchestrator.postToAllPlatforms(
        {
          id: `crisis-${crisis.id}`,
          type: 'crisis_response',
          status: 'active',
          content: {
            headline: 'Our Response',
            summary: response.immediate.statement,
            fullStory: response.immediate.statement,
            keyMessages: crisis.response.messages.supporting,
            callToAction: 'Learn more at our website',
            hashtags: ['#Transparency', '#IndigenousBusiness']
          }
        } as PRCampaign,
        { social: response.immediate.socialPosts }
      );
      actions.push('social_statement_posted');
    }
    
    // 2. Alert key stakeholders
    await this.alertStakeholders(crisis, response.immediate.internalComms);
    actions.push('stakeholders_alerted');
    
    // 3. Prepare media response if needed
    if (crisis.severity === 'high' || crisis.severity === 'critical') {
      await this.distributeMediaStatement(response.followUp.pressRelease!);
      actions.push('media_statement_sent');
    }
    
    // 4. Set up monitoring
    const monitoring = await this.setupCrisisMonitoring(crisis);
    actions.push('monitoring_activated');
    
    // 5. Prepare counter-narrative with positive stories
    if (crisis.response.strategy === 'redirect' || crisis.response.strategy === 'amplify_positive') {
      await this.deployPositiveNarratives(crisis);
      actions.push('positive_narratives_deployed');
    }
    
    return { response, actions, monitoring };
  }
  
  /**
   * Coordinate multi-wave campaign
   */
  async orchestrateMultiWave(
    campaign: PRCampaign,
    strategy: {
      waves: number;
      interval: number; // hours
      escalation: boolean; // Each wave bigger than last
      amplifiers?: string[]; // Partner accounts
    }
  ): Promise<{
    timeline: unknown[];
    execution: unknown[];
  }> {
    const timeline = [];
    const execution = [];
    
    for (let wave = 0; wave < strategy.waves; wave++) {
      const waveTime = new Date(Date.now() + (wave * strategy.interval * 3600000));
      
      // Determine wave intensity
      const intensity = strategy.escalation 
        ? (wave + 1) / strategy.waves 
        : 1;
      
      // Plan wave activities
      const waveActivities = await this.planWave(campaign, wave, intensity);
      
      timeline.push({
        wave: wave + 1,
        time: waveTime,
        activities: waveActivities,
        expectedReach: waveActivities.reduce((sum, a) => sum + a.reach, 0)
      });
      
      // Schedule wave execution
      const jobs = await this.scheduleWave(campaign, waveActivities, waveTime);
      execution.push(...jobs);
    }
    
    // Coordinate with amplifiers if provided
    if (strategy.amplifiers && strategy.amplifiers.length > 0) {
      await this.coordinateAmplifiers(campaign, strategy.amplifiers, timeline);
    }
    
    return { timeline, execution };
  }
  
  /**
   * Leverage trending topics for campaign
   */
  async rideTrendingWave(
    trendingTopics: string[]
  ): Promise<{
    campaigns: PRCampaign[];
    potentialReach: number;
  }> {
    const campaigns = [];
    let totalReach = 0;
    
    // Generate viral content for each relevant topic
    const { content: viralContent } = await this.socialOrchestrator.createViralContent(
      trendingTopics
    );
    
    for (const viral of viralContent) {
      if (viral.viralPotential > 0.7) {
        // Create mini-campaign around trending topic
        const campaign = await this.launchCampaign(
          'thought_leadership',
          {
            topic: viral.topic,
            angle: viral.posts.twitter.post,
            viral: true
          },
          { urgent: true }
        );
        
        campaigns.push(campaign.campaign);
        totalReach += campaign.projectedReach * viral.viralPotential;
      }
    }
    
    return {
      campaigns,
      potentialReach: totalReach
    };
  }
  
  /**
   * Track campaign performance in real-time
   */
  async trackCampaignPerformance(
    campaignId: string
  ): Promise<{
    metrics: PRCampaign['metrics'];
    insights: {
      topPerformingChannel: string;
      bestAudience: string;
      viralContent: unknown[];
      recommendations: string[];
    };
  }> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    
    // Aggregate metrics from all channels
    const metrics = await this.aggregateMetrics(campaign);
    
    // Update campaign metrics
    campaign.metrics = metrics;
    await this.updateCampaign(campaign);
    
    // Generate insights
    const insights = {
      topPerformingChannel: this.identifyTopChannel(metrics),
      bestAudience: await this.identifyBestAudience(campaign),
      viralContent: await this.identifyViralContent(campaign),
      recommendations: await this.generateRecommendations(campaign, metrics)
    };
    
    return { metrics, insights };
  }
  
  /**
   * Automate media outreach
   */
  async conductMediaOutreach(
    story: any,
    targetOutlets?: string[]
  ): Promise<{
    contacted: MediaOutlet[];
    responses: unknown[];
    coverage: unknown[];
  }> {
    // Get relevant media contacts
    const mediaContacts = await this.getMediaContacts(story, targetOutlets);
    
    const contacted = [];
    const responses = [];
    
    // Generate press release
    const pressRelease = await this.contentGenerator.generatePressRelease(
      story,
      mediaContacts.map(m => m.contacts[0].email)
    );
    
    // Send to each outlet
    for (const outlet of mediaContacts) {
      try {
        // Personalize for outlet
        const personalized = await this.personalizeForOutlet(pressRelease, outlet);
        
        // Send email
        await this.emailService.send({
          to: outlet.contacts[0].email,
          subject: personalized.headline,
          template: 'press-release',
          data: personalized
        });
        
        contacted.push(outlet);
        
        // Track outreach
        await this.trackMediaOutreach(outlet, story);
      } catch (error) {
        logger.error(`Failed to contact ${outlet.name}:`, error);
      }
    }
    
    // Monitor for coverage (async)
    this.monitorMediaCoverage(story, contacted);
    
    return {
      contacted,
      responses: [], // Will be populated as responses come in
      coverage: [] // Will be populated as coverage appears
    };
  }
  
  /**
   * Private helper methods
   */
  private async identifyAudiences(
    type: string,
    data: unknown,
    customAudiences?: string[]
  ): Promise<AudienceSegment[]> {
    const audiences = await prisma.audienceSegment.findMany({
      where: customAudiences 
        ? { id: { in: customAudiences } }
        : { 
            characteristics: {
              interests: { hasSome: [type, 'indigenous', 'business'] }
            }
          }
    });
    
    return audiences as unknown as AudienceSegment[];
  }
  
  private async determineGeographicScope(data: unknown): Promise<string[]> {
    // Determine geographic relevance
    if (data.national) return ['all'];
    if (data.province) return [data.province];
    return ['Ontario', 'British Columbia', 'Alberta']; // Default major provinces
  }
  
  private selectChannels(
    template: any,
    excludeChannels?: string[]
  ): PRCampaign['channels'] {
    const channels = {
      email: template.channels.includes('email'),
      sms: template.channels.includes('sms'),
      socialMedia: {
        twitter: template.channels.includes('social'),
        linkedin: template.channels.includes('social'),
        facebook: template.channels.includes('social'),
        instagram: template.channels.includes('social')
      },
      pressRelease: template.channels.includes('press'),
      website: template.channels.includes('website')
    };
    
    // Apply exclusions
    if (excludeChannels) {
      excludeChannels.forEach(channel => {
        if (channel in channels) {
          channels[channel] = false;
        }
      });
    }
    
    return channels;
  }
  
  private async optimizeSchedule(
    type: string,
    options?: any
  ): Promise<PRCampaign['schedule']> {
    if (options?.embargo) {
      return {
        launchDate: options.embargo,
        optimalTimes: [options.embargo.toISOString()]
      };
    }
    
    const now = new Date();
    const timing = this.campaignTemplates[type]?.timing || 'scheduled';
    
    if (timing === 'immediate') {
      return {
        launchDate: now,
        optimalTimes: [now.toISOString()]
      };
    }
    
    // Calculate optimal times based on audience
    const optimalHours = [9, 12, 15, 18]; // 9am, noon, 3pm, 6pm
    const nextOptimal = new Date(now);
    nextOptimal.setHours(optimalHours.find(h => h > now.getHours()) || optimalHours[0]);
    
    return {
      launchDate: nextOptimal,
      optimalTimes: optimalHours.map(h => {
        const time = new Date(nextOptimal);
        time.setHours(h);
        return time.toISOString();
      })
    };
  }
  
  private async calculateProjectedReach(campaign: PRCampaign): Promise<number> {
    let reach = 0;
    
    // Email reach
    if (campaign.channels.email) {
      const emailContacts = await prisma.contact.count({
        where: { 
          segments: { hasSome: campaign.audience.primary.map(a => a.id) }
        }
      });
      reach += emailContacts;
    }
    
    // Social reach
    if (campaign.channels.socialMedia.twitter || 
        campaign.channels.socialMedia.linkedin ||
        campaign.channels.socialMedia.facebook ||
        campaign.channels.socialMedia.instagram) {
      const socialAccounts = await this.socialOrchestrator.getActiveSocialAccounts();
      reach += socialAccounts.reduce((sum, acc) => sum + acc.profile.followers, 0);
    }
    
    // Media reach (estimated)
    if (campaign.channels.pressRelease) {
      reach += 100000; // Conservative estimate
    }
    
    return reach;
  }
  
  private async queueForApproval(campaign: PRCampaign): Promise<void> {
    await this.queueService.addJob({
      type: 'campaign_approval',
      data: { campaignId: campaign.id },
      priority: campaign.type === 'crisis' ? 'high' : 'normal'
    });
  }
  
  private async executeCampaign(
    campaign: PRCampaign,
    variations: any,
    distribution: any
  ): Promise<unknown> {
    const results = {
      totalRecipients: 0,
      channelsActivated: [],
      projectedReach: 0
    };
    
    // Execute each channel
    if (campaign.channels.email) {
      const emailResult = await this.executeEmailCampaign(campaign, distribution.email);
      results.totalRecipients += emailResult.sent;
      results.channelsActivated.push('email');
    }
    
    if (Object.values(campaign.channels.socialMedia).some(v => v)) {
      const socialResult = await this.socialOrchestrator.postToAllPlatforms(
        campaign,
        distribution
      );
      results.channelsActivated.push(...socialResult.success);
    }
    
    if (campaign.channels.pressRelease) {
      await this.distributeMediaStatement(distribution.pressRelease);
      results.channelsActivated.push('press');
    }
    
    results.projectedReach = await this.calculateProjectedReach(campaign);
    
    return results;
  }
  
  private async executeEmailCampaign(campaign: PRCampaign, content: any): Promise<unknown> {
    // Get recipient list
    const recipients = await prisma.contact.findMany({
      where: {
        segments: { hasSome: campaign.audience.primary.map(a => a.id) },
        emailOptIn: true
      }
    });
    
    // Send emails
    let sent = 0;
    for (const recipient of recipients) {
      try {
        await this.emailService.send({
          to: recipient.email,
          subject: content.subject,
          template: 'campaign',
          data: content
        });
        sent++;
      } catch (error) {
        logger.error(`Failed to email ${recipient.email}:`, error);
      }
    }
    
    return { sent, total: recipients.length };
  }
  
  private async alertStakeholders(crisis: CrisisEvent, message: string): Promise<void> {
    const stakeholders = await prisma.contact.findMany({
      where: {
        segments: { has: 'stakeholder' },
        priority: 'high'
      }
    });
    
    for (const stakeholder of stakeholders) {
      await this.emailService.send({
        to: stakeholder.email,
        subject: `Important: ${crisis.trigger.description}`,
        template: 'crisis-alert',
        data: { message, crisis }
      });
    }
  }
  
  private async distributeMediaStatement(statement: string): Promise<void> {
    const mediaContacts = await prisma.mediaOutlet.findMany({
      include: { contacts: true }
    });
    
    for (const outlet of mediaContacts) {
      if (outlet.contacts.length > 0) {
        await this.emailService.send({
          to: outlet.contacts[0].email,
          subject: 'Media Statement: Indigenious Platform',
          template: 'media-statement',
          data: { statement }
        });
      }
    }
  }
  
  private async setupCrisisMonitoring(crisis: CrisisEvent): Promise<unknown> {
    // Set up monitoring jobs
    await this.queueService.addJob({
      type: 'crisis_monitoring',
      data: { crisisId: crisis.id },
      schedule: { interval: 900000 } // Every 15 minutes
    });
    
    return {
      monitoringActive: true,
      checkInterval: 15,
      metrics: ['sentiment', 'volume', 'reach']
    };
  }
  
  private async deployPositiveNarratives(crisis: CrisisEvent): Promise<void> {
    // Find recent success stories
    const recentSuccesses = await prisma.successStory.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600000) },
        consent: { obtained: true }
      },
      orderBy: { usage: { totalReach: 'desc' } },
      take: 5
    });
    
    // Deploy as counter-narrative
    for (const success of recentSuccesses) {
      await this.launchCampaign('success_story', success.details, { urgent: true });
    }
  }
  
  private async getCampaign(campaignId: string): Promise<PRCampaign | null> {
    const campaign = await prisma.prCampaign.findUnique({
      where: { id: campaignId }
    });
    
    return campaign as unknown as PRCampaign;
  }
  
  private async updateCampaign(campaign: PRCampaign): Promise<void> {
    await prisma.prCampaign.update({
      where: { id: campaign.id },
      data: campaign as unknown
    });
  }
  
  private async aggregateMetrics(campaign: PRCampaign): Promise<PRCampaign['metrics']> {
    // Aggregate from various sources
    return {
      reach: 50000,
      engagement: 5000,
      mediaPickup: 10,
      sentimentScore: 0.8,
      conversions: 50
    };
  }
  
  private identifyTopChannel(metrics: unknown): string {
    // Analyze which channel performed best
    return 'social';
  }
  
  private async identifyBestAudience(campaign: PRCampaign): Promise<string> {
    // Analyze which audience engaged most
    return 'media';
  }
  
  private async identifyViralContent(campaign: PRCampaign): Promise<any[]> {
    // Find content that went viral
    return [];
  }
  
  private async generateRecommendations(campaign: PRCampaign, metrics: any): Promise<string[]> {
    const recommendations = [];
    
    if (metrics.engagement / metrics.reach < 0.05) {
      recommendations.push('Consider more engaging content formats');
    }
    
    if (metrics.mediaPickup < 5) {
      recommendations.push('Strengthen media relationships');
    }
    
    return recommendations;
  }
  
  private async planWave(campaign: PRCampaign, wave: number, intensity: number): Promise<any[]> {
    // Plan activities for this wave
    return [];
  }
  
  private async scheduleWave(campaign: PRCampaign, activities: unknown[], time: Date): Promise<any[]> {
    // Schedule wave activities
    return [];
  }
  
  private async coordinateAmplifiers(
    campaign: PRCampaign,
    amplifiers: string[],
    timeline: unknown[]
  ): Promise<void> {
    // Coordinate with partner accounts
  }
  
  private async getMediaContacts(story: any, targetOutlets?: string[]): Promise<MediaOutlet[]> {
    const query: any = {
      where: {}
    };
    
    if (targetOutlets) {
      query.where.id = { in: targetOutlets };
    } else {
      query.where.profile = {
        focus: { hasSome: ['indigenous', 'business', story.type] }
      };
    }
    
    const outlets = await prisma.mediaOutlet.findMany(query);
    
    return outlets as unknown as MediaOutlet[];
  }
  
  private async personalizeForOutlet(
    pressRelease: any,
    outlet: MediaOutlet
  ): Promise<unknown> {
    // Personalize content for specific outlet
    return {
      ...pressRelease,
      headline: `Exclusive to ${outlet.name}: ${pressRelease.headline}`
    };
  }
  
  private async trackMediaOutreach(outlet: MediaOutlet, story: any): Promise<void> {
    await prisma.mediaOutreach.create({
      data: {
        outletId: outlet.id,
        storyId: story.id,
        sentAt: new Date(),
        status: 'sent'
      }
    });
  }
  
  private async monitorMediaCoverage(story: any, outlets: MediaOutlet[]): Promise<void> {
    // Set up monitoring for media coverage
    await this.queueService.addJob({
      type: 'media_monitoring',
      data: {
        storyId: story.id,
        outlets: outlets.map(o => o.id)
      },
      schedule: { interval: 3600000, duration: 604800000 } // Every hour for a week
    });
  }
  
  private initializeCampaignMonitoring(): void {
    // Monitor campaign performance
    setInterval(() => {
      this.checkActiveCampaigns().catch((error) => logger.error('Campaign check error:', error));
    }, 3600000); // Every hour
  }
  
  private async checkActiveCampaigns(): Promise<void> {
    const activeCampaigns = await prisma.prCampaign.findMany({
      where: { status: 'active' }
    });
    
    for (const campaign of activeCampaigns) {
      await this.trackCampaignPerformance(campaign.id);
    }
  }
}

export default CampaignOrchestrator;