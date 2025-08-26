/**
 * Multi-Channel Outreach Engine
 * Manages outreach campaigns across 10+ channels with personalization
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import axios from 'axios';
import { OpenAI } from 'openai';
import { createLogger } from '../core/utils/logger';
import { ContactEnricher } from '../enrichment/ContactEnricher';
import { ComplianceEngine } from '../compliance/ComplianceEngine';
import {
  EnrichedBusiness,
  DiscoveredBusiness
} from '../types';
import {
  OutreachCampaign,
  CampaignStatus,
  OutreachChannel,
  ChannelType,
  OutreachTemplate,
  CampaignSchedule,
  CampaignMetrics,
  TemplateMetrics,
  DiscoveredContact
} from '../types/enhanced-types';

export interface OutreachEngineOptions {
  maxConcurrentCampaigns: number;
  maxContactsPerDay: number;
  enableABTesting: boolean;
  enablePersonalization: boolean;
  enableFollowUps: boolean;
  complianceMode: 'strict' | 'moderate' | 'relaxed';
}

export interface ChannelProvider {
  type: ChannelType;
  send: (contact: DiscoveredContact, template: OutreachTemplate, personalization: any) => Promise<boolean>;
  trackEngagement: (messageId: string) => Promise<any>;
  getCapabilities: () => ChannelCapabilities;
}

export interface ChannelCapabilities {
  maxMessageLength: number;
  supportsAttachments: boolean;
  supportsHTML: boolean;
  supportsScheduling: boolean;
  supportsTracking: boolean;
  rateLimit: number;
}

export class OutreachEngine extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly options: OutreachEngineOptions;
  private readonly openai: OpenAI;
  private readonly contactEnricher: ContactEnricher;
  private readonly complianceEngine: ComplianceEngine;
  private readonly channelProviders: Map<ChannelType, ChannelProvider>;
  private activeCampaigns: Map<string, OutreachCampaign>;

  // Channel configurations
  private readonly channelConfigs = {
    [ChannelType.EMAIL]: {
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY,
      fromAddress: process.env.EMAIL_FROM_ADDRESS || 'outreach@indigenousbusiness.ca',
      rateLimit: 100 // per minute
    },
    [ChannelType.SMS]: {
      provider: 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.SMS_FROM_NUMBER,
      rateLimit: 60
    },
    [ChannelType.LINKEDIN]: {
      provider: 'linkedin',
      apiKey: process.env.LINKEDIN_API_KEY,
      rateLimit: 30
    },
    [ChannelType.TWITTER]: {
      provider: 'twitter',
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
      rateLimit: 300
    },
    [ChannelType.INSTAGRAM]: {
      provider: 'instagram',
      apiKey: process.env.INSTAGRAM_API_KEY,
      rateLimit: 60
    },
    [ChannelType.TIKTOK]: {
      provider: 'tiktok',
      apiKey: process.env.TIKTOK_API_KEY,
      rateLimit: 100
    },
    [ChannelType.REDDIT]: {
      provider: 'reddit',
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      rateLimit: 60
    },
    [ChannelType.WHATSAPP]: {
      provider: 'whatsapp',
      apiKey: process.env.WHATSAPP_API_KEY,
      phoneId: process.env.WHATSAPP_PHONE_ID,
      rateLimit: 80
    },
    [ChannelType.YOUTUBE]: {
      provider: 'youtube',
      apiKey: process.env.YOUTUBE_API_KEY,
      rateLimit: 50
    },
    [ChannelType.FACEBOOK]: {
      provider: 'facebook',
      apiKey: process.env.FACEBOOK_API_KEY,
      pageId: process.env.FACEBOOK_PAGE_ID,
      rateLimit: 200
    }
  };

  constructor(
    redis: Redis,
    options?: Partial<OutreachEngineOptions>
  ) {
    super();
    this.logger = createLogger('outreach-engine');
    this.redis = redis;
    this.activeCampaigns = new Map();
    
    // Default options
    this.options = {
      maxConcurrentCampaigns: 10,
      maxContactsPerDay: 1000,
      enableABTesting: true,
      enablePersonalization: true,
      enableFollowUps: true,
      complianceMode: 'strict',
      ...options
    };

    // Initialize OpenAI for personalization
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Initialize enrichment and compliance
    this.contactEnricher = new ContactEnricher(redis);
    this.complianceEngine = new ComplianceEngine(redis);

    // Initialize channel providers
    this.channelProviders = new Map();
    this.initializeChannelProviders();
  }

  /**
   * Create and launch a new outreach campaign
   */
  async createCampaign(
    name: string,
    targetBusinesses: (DiscoveredBusiness | EnrichedBusiness)[],
    channels: ChannelType[],
    templates: OutreachTemplate[],
    schedule: CampaignSchedule
  ): Promise<OutreachCampaign> {
    const campaignId = this.generateCampaignId();
    
    this.logger.info(`Creating outreach campaign: ${name}`, {
      campaignId,
      targetCount: targetBusinesses.length,
      channels
    });

    // Validate campaign
    await this.validateCampaign(targetBusinesses, channels, templates);

    // Check compliance
    const complianceCheck = await this.complianceEngine.checkCampaignCompliance({
      targetBusinesses,
      channels,
      templates,
      schedule
    });

    if (!complianceCheck.compliant && this.options.complianceMode === 'strict') {
      throw new Error(`Campaign not compliant: ${complianceCheck.issues.join(', ')}`);
    }

    // Create campaign object
    const campaign: OutreachCampaign = {
      id: campaignId,
      name,
      status: CampaignStatus.DRAFT,
      channels: this.createChannelConfigs(channels),
      targetBusinesses: targetBusinesses.map(b => b.id),
      templates,
      schedule,
      metrics: this.initializeMetrics(),
      compliance: complianceCheck,
      createdAt: new Date()
    };

    // Store campaign
    await this.redis.setex(
      `campaign:${campaignId}`,
      86400 * 30, // 30 days
      JSON.stringify(campaign)
    );

    this.activeCampaigns.set(campaignId, campaign);

    this.emit('campaign:created', campaign);

    return campaign;
  }

  /**
   * Start a campaign
   */
  async startCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new Error(`Campaign ${campaignId} cannot be started from status ${campaign.status}`);
    }

    this.logger.info(`Starting campaign: ${campaign.name}`, { campaignId });

    // Update status
    campaign.status = CampaignStatus.ACTIVE;
    campaign.startedAt = new Date();

    // Start processing
    this.processCampaign(campaign).catch(error => {
      this.logger.error(`Campaign processing failed for ${campaignId}:`, error);
      campaign.status = CampaignStatus.FAILED;
      this.emit('campaign:failed', { campaignId, error });
    });

    await this.saveCampaign(campaign);
    
    this.emit('campaign:started', campaign);
  }

  /**
   * Process a campaign
   */
  private async processCampaign(campaign: OutreachCampaign): Promise<void> {
    const startTime = Date.now();
    const targetBusinesses = await this.loadTargetBusinesses(campaign.targetBusinesses);
    
    this.logger.info(`Processing campaign ${campaign.id} with ${targetBusinesses.length} targets`);

    // Process in batches
    const batchSize = 50;
    let processedCount = 0;
    let sentCount = 0;

    for (let i = 0; i < targetBusinesses.length; i += batchSize) {
      if (campaign.status !== CampaignStatus.ACTIVE) {
        this.logger.info(`Campaign ${campaign.id} stopped`);
        break;
      }

      const batch = targetBusinesses.slice(i, i + batchSize);

      // Check daily limit
      const dailySent = await this.getDailySentCount();
      if (dailySent >= this.options.maxContactsPerDay) {
        this.logger.warn('Daily contact limit reached, pausing campaign');
        campaign.status = CampaignStatus.PAUSED;
        break;
      }

      // Process batch
      const results = await Promise.allSettled(
        batch.map(business => this.processBusinessOutreach(business, campaign))
      );

      // Update metrics
      for (const result of results) {
        processedCount++;
        if (result.status === 'fulfilled' && result.value) {
          sentCount += result.value.sent;
          campaign.metrics.sent += result.value.sent;
        } else if (result.status === 'rejected') {
          campaign.metrics.errors++;
          this.logger.error('Outreach failed:', result.reason);
        }
      }

      // Update progress
      this.emit('campaign:progress', {
        campaignId: campaign.id,
        processed: processedCount,
        sent: sentCount,
        total: targetBusinesses.length
      });

      // Rate limiting between batches
      await this.sleep(5000); // 5 seconds
    }

    // Complete campaign
    campaign.status = CampaignStatus.COMPLETED;
    campaign.completedAt = new Date();
    campaign.metrics.duration = Date.now() - startTime;

    await this.saveCampaign(campaign);

    this.logger.info(`Campaign ${campaign.id} completed`, {
      sent: sentCount,
      duration: campaign.metrics.duration
    });

    this.emit('campaign:completed', campaign);
  }

  /**
   * Process outreach for a single business
   */
  private async processBusinessOutreach(
    business: DiscoveredBusiness | EnrichedBusiness,
    campaign: OutreachCampaign
  ): Promise<{ sent: number; errors: number }> {
    let sent = 0;
    let errors = 0;

    try {
      // Enrich business with contacts if needed
      const enrichedBusiness = await this.ensureBusinessHasContacts(business);

      if (!enrichedBusiness.contacts || enrichedBusiness.contacts.length === 0) {
        this.logger.warn(`No contacts found for business ${business.name}`);
        return { sent: 0, errors: 0 };
      }

      // Get decision makers first
      const contacts = this.prioritizeContacts(enrichedBusiness.contacts);

      // Send through each channel
      for (const channelConfig of campaign.channels) {
        if (!channelConfig.enabled) continue;

        const provider = this.channelProviders.get(channelConfig.type);
        if (!provider) {
          this.logger.warn(`No provider for channel ${channelConfig.type}`);
          continue;
        }

        // Select appropriate template
        const template = this.selectTemplate(
          campaign.templates,
          channelConfig.type,
          campaign.metrics
        );

        if (!template) {
          this.logger.warn(`No template for channel ${channelConfig.type}`);
          continue;
        }

        // Send to contacts
        for (const contact of contacts) {
          try {
            // Check if we can reach this contact through this channel
            if (!this.canReachContact(contact, channelConfig.type)) {
              continue;
            }

            // Generate personalization
            const personalization = await this.generatePersonalization(
              enrichedBusiness,
              contact,
              template
            );

            // Send message
            const success = await provider.send(contact, template, personalization);

            if (success) {
              sent++;
              
              // Track sending
              await this.trackSending(campaign.id, business.id, contact.id, channelConfig.type);
              
              // Update template metrics
              this.updateTemplateMetrics(template, 'sent');

              // Schedule follow-ups if enabled
              if (this.options.enableFollowUps && campaign.schedule.followUpDelays.length > 0) {
                await this.scheduleFollowUps(
                  campaign,
                  business,
                  contact,
                  channelConfig.type,
                  template
                );
              }
            }

            // Rate limiting
            await this.sleep(60000 / (channelConfig.rateLimit || 60)); // Convert to ms between messages

          } catch (error) {
            errors++;
            this.logger.error(`Failed to send ${channelConfig.type} to ${contact.email || contact.phone}:`, error);
          }
        }
      }

    } catch (error) {
      this.logger.error(`Business outreach failed for ${business.name}:`, error);
      errors++;
    }

    return { sent, errors };
  }

  /**
   * Ensure business has contacts
   */
  private async ensureBusinessHasContacts(
    business: DiscoveredBusiness | EnrichedBusiness
  ): Promise<EnrichedBusiness> {
    if ('contacts' in business && business.contacts && business.contacts.length > 0) {
      return business as EnrichedBusiness;
    }

    // Enrich with contacts
    return await this.contactEnricher.enrichBusinessWithContacts(business);
  }

  /**
   * Prioritize contacts for outreach
   */
  private prioritizeContacts(contacts: any[]): DiscoveredContact[] {
    return contacts
      .map(c => ({
        ...c,
        id: c.id || this.generateContactId(),
        businessId: c.businessId || '',
        type: c.type || 'general',
        fullName: c.name || c.fullName || 'Unknown',
        isDecisionMaker: c.isPrimary || c.isDecisionMaker || false,
        isPrimary: c.isPrimary || false,
        confidence: c.confidence || 0.5,
        discoveredFrom: c.discoveredFrom || ['unknown']
      } as DiscoveredContact))
      .sort((a, b) => {
        // Decision makers first
        if (a.isDecisionMaker && !b.isDecisionMaker) return -1;
        if (!a.isDecisionMaker && b.isDecisionMaker) return 1;
        
        // Then by confidence
        return b.confidence - a.confidence;
      })
      .slice(0, 3); // Max 3 contacts per business
  }

  /**
   * Check if we can reach contact through channel
   */
  private canReachContact(contact: DiscoveredContact, channel: ChannelType): boolean {
    switch (channel) {
      case ChannelType.EMAIL:
        return !!contact.email && (contact.emailVerified !== false);
      
      case ChannelType.SMS:
      case ChannelType.WHATSAPP:
        return !!contact.phone && contact.phoneType === 'mobile';
      
      case ChannelType.LINKEDIN:
        return !!contact.linkedin;
      
      case ChannelType.TWITTER:
      case ChannelType.INSTAGRAM:
      case ChannelType.TIKTOK:
      case ChannelType.REDDIT:
      case ChannelType.YOUTUBE:
      case ChannelType.FACEBOOK:
        return !!contact.email || !!contact.linkedin; // Can search by email/profile
      
      default:
        return false;
    }
  }

  /**
   * Select best template for channel
   */
  private selectTemplate(
    templates: OutreachTemplate[],
    channel: ChannelType,
    metrics: CampaignMetrics
  ): OutreachTemplate | null {
    const channelTemplates = templates.filter(t => t.channelType === channel);
    
    if (channelTemplates.length === 0) return null;
    if (channelTemplates.length === 1) return channelTemplates[0];

    // A/B testing - select based on performance
    if (this.options.enableABTesting && metrics.sent > 100) {
      // Sort by conversion rate
      return channelTemplates.sort((a, b) => {
        const aRate = (a.performanceMetrics?.conversionRate || 0);
        const bRate = (b.performanceMetrics?.conversionRate || 0);
        return bRate - aRate;
      })[0];
    }

    // Random selection for initial testing
    return channelTemplates[Math.floor(Math.random() * channelTemplates.length)];
  }

  /**
   * Generate personalized content
   */
  private async generatePersonalization(
    business: EnrichedBusiness,
    contact: DiscoveredContact,
    template: OutreachTemplate
  ): Promise<Record<string, string>> {
    const personalization: Record<string, string> = {
      businessName: business.name,
      contactName: contact.fullName,
      firstName: contact.firstName || contact.fullName.split(' ')[0] || 'there',
      title: contact.title || '',
      industry: business.industry?.[0] || 'your industry',
      location: business.address?.city || 'your area'
    };

    // GPT-4 powered personalization
    if (this.options.enablePersonalization && process.env.OPENAI_API_KEY) {
      try {
        const prompt = `
          Generate personalized outreach content for:
          Business: ${business.name} (${business.description || business.industry?.join(', ')})
          Contact: ${contact.fullName} (${contact.title || 'Unknown role'})
          Channel: ${template.channelType}
          
          Template: ${template.content}
          
          Requirements:
          - Keep the same structure and key message
          - Personalize the opening and value proposition
          - Make it relevant to their business/industry
          - Professional but conversational tone
          - Under ${this.getChannelCharLimit(template.channelType)} characters
        `;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'You are an expert at B2B outreach personalization.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        const personalizedContent = response.choices[0]?.message?.content;
        if (personalizedContent) {
          personalization.personalizedContent = personalizedContent;
        }

      } catch (error) {
        this.logger.error('Personalization generation failed:', error);
      }
    }

    return personalization;
  }

  /**
   * Initialize channel providers
   */
  private initializeChannelProviders(): void {
    // Email provider (SendGrid)
    if (this.channelConfigs[ChannelType.EMAIL].apiKey) {
      this.channelProviders.set(ChannelType.EMAIL, this.createEmailProvider());
    }

    // SMS provider (Twilio)
    if (this.channelConfigs[ChannelType.SMS].accountSid) {
      this.channelProviders.set(ChannelType.SMS, this.createSMSProvider());
    }

    // Social media providers
    this.initializeSocialProviders();
  }

  /**
   * Create email provider
   */
  private createEmailProvider(): ChannelProvider {
    const config = this.channelConfigs[ChannelType.EMAIL];
    
    return {
      type: ChannelType.EMAIL,
      send: async (contact, template, personalization) => {
        if (!contact.email) return false;

        try {
          const response = await axios.post(
            'https://api.sendgrid.com/v3/mail/send',
            {
              personalizations: [{
                to: [{ email: contact.email, name: contact.fullName }],
                dynamic_template_data: personalization
              }],
              from: {
                email: config.fromAddress,
                name: 'Indigenous Business Network'
              },
              subject: this.personalizeText(template.subject || 'Partnership Opportunity', personalization),
              content: [{
                type: 'text/html',
                value: this.personalizeText(
                  personalization.personalizedContent || template.content,
                  personalization
                )
              }],
              tracking_settings: {
                click_tracking: { enable: true },
                open_tracking: { enable: true }
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
              }
            }
          );

          return response.status === 202;

        } catch (error) {
          this.logger.error('SendGrid error:', error);
          return false;
        }
      },
      trackEngagement: async (messageId) => {
        // Webhook handling for engagement tracking
        return {};
      },
      getCapabilities: () => ({
        maxMessageLength: 50000,
        supportsAttachments: true,
        supportsHTML: true,
        supportsScheduling: true,
        supportsTracking: true,
        rateLimit: config.rateLimit
      })
    };
  }

  /**
   * Create SMS provider
   */
  private createSMSProvider(): ChannelProvider {
    const config = this.channelConfigs[ChannelType.SMS];
    
    return {
      type: ChannelType.SMS,
      send: async (contact, template, personalization) => {
        if (!contact.phone || contact.phoneType !== 'mobile') return false;

        try {
          const accountSid = config.accountSid;
          const authToken = config.authToken;
          const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

          const response = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            new URLSearchParams({
              From: config.fromNumber!,
              To: contact.phone,
              Body: this.personalizeText(template.content, personalization).substring(0, 1600)
            }),
            {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );

          return response.data.status !== 'failed';

        } catch (error) {
          this.logger.error('Twilio error:', error);
          return false;
        }
      },
      trackEngagement: async (messageId) => {
        return {};
      },
      getCapabilities: () => ({
        maxMessageLength: 1600,
        supportsAttachments: false,
        supportsHTML: false,
        supportsScheduling: true,
        supportsTracking: true,
        rateLimit: config.rateLimit
      })
    };
  }

  /**
   * Initialize social media providers
   */
  private initializeSocialProviders(): void {
    // LinkedIn, Twitter, Instagram, etc.
    // These would integrate with respective APIs
    // For now, we'll create placeholder providers
    
    const socialChannels = [
      ChannelType.LINKEDIN,
      ChannelType.TWITTER,
      ChannelType.INSTAGRAM,
      ChannelType.TIKTOK,
      ChannelType.REDDIT,
      ChannelType.WHATSAPP,
      ChannelType.YOUTUBE,
      ChannelType.FACEBOOK
    ];

    for (const channel of socialChannels) {
      if (this.channelConfigs[channel].apiKey) {
        this.channelProviders.set(channel, this.createSocialProvider(channel));
      }
    }
  }

  /**
   * Create social media provider
   */
  private createSocialProvider(channel: ChannelType): ChannelProvider {
    return {
      type: channel,
      send: async (contact, template, personalization) => {
        // Placeholder implementation
        this.logger.debug(`Sending ${channel} message to ${contact.fullName}`);
        return true;
      },
      trackEngagement: async (messageId) => {
        return {};
      },
      getCapabilities: () => ({
        maxMessageLength: this.getChannelCharLimit(channel),
        supportsAttachments: channel !== ChannelType.SMS,
        supportsHTML: false,
        supportsScheduling: true,
        supportsTracking: true,
        rateLimit: this.channelConfigs[channel].rateLimit
      })
    };
  }

  /**
   * Get character limit for channel
   */
  private getChannelCharLimit(channel: ChannelType): number {
    const limits: Record<ChannelType, number> = {
      [ChannelType.EMAIL]: 50000,
      [ChannelType.SMS]: 1600,
      [ChannelType.LINKEDIN]: 1300,
      [ChannelType.TWITTER]: 280,
      [ChannelType.INSTAGRAM]: 2200,
      [ChannelType.TIKTOK]: 2200,
      [ChannelType.REDDIT]: 40000,
      [ChannelType.WHATSAPP]: 4096,
      [ChannelType.YOUTUBE]: 5000,
      [ChannelType.FACEBOOK]: 63206
    };
    return limits[channel] || 1000;
  }

  /**
   * Personalize text with variables
   */
  private personalizeText(text: string, personalization: Record<string, string>): string {
    let personalized = text;
    
    for (const [key, value] of Object.entries(personalization)) {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      personalized = personalized.replace(regex, value || '');
    }
    
    return personalized;
  }

  /**
   * Helper methods
   */
  private async validateCampaign(
    targetBusinesses: any[],
    channels: ChannelType[],
    templates: OutreachTemplate[]
  ): Promise<void> {
    if (targetBusinesses.length === 0) {
      throw new Error('No target businesses provided');
    }

    if (channels.length === 0) {
      throw new Error('No channels selected');
    }

    if (templates.length === 0) {
      throw new Error('No templates provided');
    }

    // Validate each channel has at least one template
    for (const channel of channels) {
      const hasTemplate = templates.some(t => t.channelType === channel);
      if (!hasTemplate) {
        throw new Error(`No template provided for channel ${channel}`);
      }
    }
  }

  private createChannelConfigs(channels: ChannelType[]): OutreachChannel[] {
    return channels.map(type => ({
      type,
      enabled: true,
      config: this.channelConfigs[type] as any,
      templates: [],
      priority: 1
    }));
  }

  private initializeMetrics(): CampaignMetrics {
    return {
      totalTargets: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      responded: 0,
      optedOut: 0,
      bounced: 0,
      converted: 0,
      errors: 0,
      costPerContact: 0,
      roi: 0,
      duration: 0
    };
  }

  private async getCampaign(campaignId: string): Promise<OutreachCampaign | null> {
    const cached = await this.redis.get(`campaign:${campaignId}`);
    return cached ? JSON.parse(cached) : null;
  }

  private async saveCampaign(campaign: OutreachCampaign): Promise<void> {
    await this.redis.setex(
      `campaign:${campaign.id}`,
      86400 * 30,
      JSON.stringify(campaign)
    );
  }

  private async loadTargetBusinesses(businessIds: string[]): Promise<EnrichedBusiness[]> {
    // Load from database/cache
    const businesses: EnrichedBusiness[] = [];
    
    for (const id of businessIds) {
      const cached = await this.redis.get(`business:${id}`);
      if (cached) {
        businesses.push(JSON.parse(cached));
      }
    }
    
    return businesses;
  }

  private async getDailySentCount(): Promise<number> {
    const key = `outreach:daily:${new Date().toISOString().split('T')[0]}`;
    const count = await this.redis.get(key);
    return parseInt(count || '0');
  }

  private async trackSending(
    campaignId: string,
    businessId: string,
    contactId: string,
    channel: ChannelType
  ): Promise<void> {
    const key = `outreach:sent:${campaignId}:${businessId}:${contactId}:${channel}`;
    await this.redis.setex(key, 86400 * 7, Date.now().toString());
    
    // Increment daily counter
    const dailyKey = `outreach:daily:${new Date().toISOString().split('T')[0]}`;
    await this.redis.incr(dailyKey);
    await this.redis.expire(dailyKey, 86400 * 2);
  }

  private updateTemplateMetrics(template: OutreachTemplate, metric: keyof TemplateMetrics): void {
    if (!template.performanceMetrics) {
      template.performanceMetrics = {
        sent: 0,
        opened: 0,
        clicked: 0,
        responded: 0,
        converted: 0,
        openRate: 0,
        clickRate: 0,
        responseRate: 0,
        conversionRate: 0
      };
    }
    
    template.performanceMetrics[metric]++;
    
    // Recalculate rates
    if (template.performanceMetrics.sent > 0) {
      template.performanceMetrics.openRate = template.performanceMetrics.opened / template.performanceMetrics.sent;
      template.performanceMetrics.clickRate = template.performanceMetrics.clicked / template.performanceMetrics.sent;
      template.performanceMetrics.responseRate = template.performanceMetrics.responded / template.performanceMetrics.sent;
      template.performanceMetrics.conversionRate = template.performanceMetrics.converted / template.performanceMetrics.sent;
    }
  }

  private async scheduleFollowUps(
    campaign: OutreachCampaign,
    business: EnrichedBusiness,
    contact: DiscoveredContact,
    channel: ChannelType,
    originalTemplate: OutreachTemplate
  ): Promise<void> {
    for (let i = 0; i < campaign.schedule.followUpDelays.length; i++) {
      const delay = campaign.schedule.followUpDelays[i];
      const followUpTime = Date.now() + (delay * 3600 * 1000); // Convert hours to ms
      
      const followUpTask = {
        campaignId: campaign.id,
        businessId: business.id,
        contactId: contact.id,
        channel,
        templateId: originalTemplate.id,
        followUpNumber: i + 1,
        scheduledFor: followUpTime
      };
      
      await this.redis.zadd(
        'outreach:followups',
        followUpTime,
        JSON.stringify(followUpTask)
      );
    }
  }

  private generateCampaignId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateContactId(): string {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public methods for campaign management
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (campaign && campaign.status === CampaignStatus.ACTIVE) {
      campaign.status = CampaignStatus.PAUSED;
      await this.saveCampaign(campaign);
      this.emit('campaign:paused', campaign);
    }
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (campaign && campaign.status === CampaignStatus.PAUSED) {
      campaign.status = CampaignStatus.ACTIVE;
      await this.saveCampaign(campaign);
      this.processCampaign(campaign);
      this.emit('campaign:resumed', campaign);
    }
  }

  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | null> {
    const campaign = await this.getCampaign(campaignId);
    return campaign ? campaign.metrics : null;
  }

  async getActiveCampaigns(): Promise<OutreachCampaign[]> {
    return Array.from(this.activeCampaigns.values());
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.activeCampaigns.clear();
    await this.contactEnricher.cleanup();
    await this.complianceEngine.cleanup();
  }
}