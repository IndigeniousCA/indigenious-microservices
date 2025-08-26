/**
 * PR Content Generator
 * AI-powered content creation for multiple channels and audiences
 * Generates culturally appropriate, impactful messaging
 */

import { AIIntelligenceService } from '@/features/ai-intelligence/services/AIIntelligenceService';
import { ContentAdaptationEngine } from '@/features/ai-intelligence/services/ContentAdaptationEngine';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import type { 
  PRCampaign, 
  ContentTemplate, 
  SuccessStory, 
  AudienceSegment 
} from '../types';

export class PRContentGenerator {
  private static instance: PRContentGenerator;
  private aiService = new AIIntelligenceService();
  private contentEngine = new ContentAdaptationEngine();
  
  // Tone mappings for different contexts
  private toneProfiles = {
    media_formal: {
      style: 'professional',
      vocabulary: 'sophisticated',
      structure: 'inverted pyramid',
      emotion: 'measured'
    },
    indigenous_community: {
      style: 'respectful',
      vocabulary: 'inclusive',
      structure: 'narrative',
      emotion: 'pride'
    },
    business_audience: {
      style: 'results-oriented',
      vocabulary: 'ROI-focused',
      structure: 'problem-solution',
      emotion: 'confidence'
    },
    government_stakeholder: {
      style: 'policy-aligned',
      vocabulary: 'regulatory',
      structure: 'evidence-based',
      emotion: 'authoritative'
    },
    social_media: {
      style: 'conversational',
      vocabulary: 'accessible',
      structure: 'hook-driven',
      emotion: 'engaging'
    }
  };
  
  // Key message frameworks
  private messageFrameworks = {
    economic_empowerment: [
      'Indigenous businesses driving $X in economic activity',
      'Creating sustainable prosperity for future generations',
      'Building wealth within Indigenous communities'
    ],
    reconciliation: [
      'Economic reconciliation in action',
      'Partnership and prosperity together',
      'Bridging communities through commerce'
    ],
    innovation: [
      'Indigenous innovation leading the way',
      'Traditional knowledge meets modern technology',
      'First Nations pioneering digital transformation'
    ],
    success: [
      'Another milestone for Indigenous procurement',
      'Celebrating Indigenous business excellence',
      'Success story: How {{businessName}} won {{contractValue}}'
    ]
  };
  
  private constructor() {}
  
  static getInstance(): PRContentGenerator {
    if (!this.instance) {
      this.instance = new PRContentGenerator();
    }
    return this.instance;
  }
  
  /**
   * Generate complete PR campaign content
   */
  async generateCampaignContent(
    campaignType: PRCampaign['type'],
    data: {
      businessName?: string;
      achievement?: string;
      value?: number;
      impact?: any;
      customData?: Record<string, any>;
    },
    audiences: AudienceSegment[]
  ): Promise<{
    master: PRCampaign['content'];
    variations: Record<string, PRCampaign['content']>;
    distribution: Record<string, any>;
  }> {
    // Generate master content
    const master = await this.generateMasterContent(campaignType, data);
    
    // Create audience-specific variations
    const variations: Record<string, PRCampaign['content']> = {};
    for (const audience of audiences) {
      variations[audience.id] = await this.adaptContentForAudience(
        master,
        audience,
        campaignType
      );
    }
    
    // Generate channel-specific versions
    const distribution = await this.generateChannelVersions(master, variations);
    
    // Add Indigenous language translations if needed
    if (this.shouldIncludeIndigenousLanguages(campaignType)) {
      await this.addIndigenousTranslations(master, variations);
    }
    
    // Log content generation
    await indigenousLedger.log(
      'pr.content.generated',
      'info',
      'PR content generated',
      {
        campaignType,
        audienceCount: audiences.length,
        hasTranslations: !!master.indigenousTranslations
      }
    );
    
    return { master, variations, distribution };
  }
  
  /**
   * Generate story from success event
   */
  async generateSuccessStory(
    event: {
      type: SuccessStory['type'];
      business: any;
      details: Record<string, unknown>;
    }
  ): Promise<SuccessStory> {
    // Extract key facts
    const facts = this.extractKeyFacts(event);
    
    // Generate narrative structure
    const narrative = await this.aiService.generateContent({
      type: 'success_story',
      data: facts,
      requirements: {
        background: 'Set context for the achievement',
        challenge: 'What obstacle was overcome',
        solution: 'How the platform/business solved it',
        outcome: 'Quantifiable results and impact'
      }
    });
    
    // Generate compelling quote
    const quote = await this.generateQuote(event, narrative);
    
    // Create story object
    const story: SuccessStory = {
      id: `story-${Date.now()}`,
      type: event.type,
      details: {
        businessName: event.business.name,
        businessId: event.business.id,
        achievement: facts.headline,
        value: facts.value,
        impactMetrics: facts.impact,
        date: new Date(),
        location: {
          community: event.business.community,
          province: event.business.province,
          onReserve: event.business.onReserve || false
        }
      },
      narrative: {
        background: narrative.background,
        challenge: narrative.challenge,
        solution: narrative.solution,
        outcome: narrative.outcome,
        quote: quote
      },
      consent: {
        obtained: false, // Will be obtained separately
        restrictions: []
      },
      usage: {
        campaigns: [],
        publishedChannels: [],
        mediaPickup: [],
        totalReach: 0
      }
    };
    
    return story;
  }
  
  /**
   * Generate crisis response content
   */
  async generateCrisisResponse(
    crisis: {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedParties: string[];
    }
  ): Promise<{
    immediate: {
      statement: string;
      socialPosts: string[];
      internalComms: string;
    };
    followUp: {
      pressRelease?: string;
      FAQ: Array<{ question: string; answer: string }>;
      stakeholderMessages: Record<string, string>;
    };
  }> {
    // Determine response strategy
    const strategy = this.determineResponseStrategy(crisis);
    
    // Generate immediate response
    const immediate = {
      statement: await this.generateCrisisStatement(crisis, strategy),
      socialPosts: await this.generateCrisisSocialPosts(crisis, strategy),
      internalComms: await this.generateInternalBrief(crisis)
    };
    
    // Generate follow-up materials
    const followUp = {
      pressRelease: crisis.severity !== 'low' 
        ? await this.generateCrisisPressRelease(crisis, strategy)
        : undefined,
      FAQ: await this.generateCrisisFAQ(crisis),
      stakeholderMessages: await this.generateStakeholderMessages(crisis)
    };
    
    return { immediate, followUp };
  }
  
  /**
   * Generate social media content
   */
  async generateSocialContent(
    platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram',
    topic: string,
    data: unknown
  ): Promise<{
    post: string;
    hashtags: string[];
    media?: {
      type: 'image' | 'video' | 'infographic';
      prompt: string; // For AI image generation
    };
    thread?: string[]; // For Twitter threads
  }> {
    const platformLimits = {
      twitter: { chars: 280, hashtags: 3 },
      linkedin: { chars: 3000, hashtags: 5 },
      facebook: { chars: 63206, hashtags: 5 },
      instagram: { chars: 2200, hashtags: 30 }
    };
    
    const limit = platformLimits[platform];
    
    // Generate platform-optimized content
    const content = await this.aiService.generateContent({
      type: 'social_post',
      platform,
      topic,
      data,
      constraints: {
        maxLength: limit.chars - (limit.hashtags * 15), // Reserve space for hashtags
        tone: this.toneProfiles.social_media,
        includeEmoji: platform !== 'linkedin',
        callToAction: true
      }
    });
    
    // Generate relevant hashtags
    const hashtags = await this.generateHashtags(topic, data, limit.hashtags);
    
    // Determine if visual content needed
    const media = this.shouldIncludeMedia(platform, topic)
      ? await this.generateMediaPrompt(topic, data, platform)
      : undefined;
    
    // Create thread for complex topics on Twitter
    const thread = platform === 'twitter' && content.length > 1000
      ? this.breakIntoThread(content, 280)
      : undefined;
    
    return {
      post: thread ? thread[0] : content,
      hashtags,
      media,
      thread
    };
  }
  
  /**
   * Generate press release
   */
  async generatePressRelease(
    story: SuccessStory,
    contacts: string[]
  ): Promise<{
    headline: string;
    subheadline: string;
    dateline: string;
    body: string[];
    boilerplate: string;
    contacts: string;
    notes: string[];
  }> {
    const location = `${story.details.location.community || story.details.location.province}`;
    const date = new Date().toLocaleDateString('en-CA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return {
      headline: await this.generateHeadline(story, 'press'),
      subheadline: await this.generateSubheadline(story),
      dateline: `${location.toUpperCase()} - ${date} -`,
      body: await this.generatePressBody(story),
      boilerplate: await this.generateBoilerplate(),
      contacts: this.formatPressContacts(contacts),
      notes: await this.generateEditorsNotes(story)
    };
  }
  
  /**
   * Private helper methods
   */
  private async generateMasterContent(
    type: PRCampaign['type'],
    data: unknown
  ): Promise<PRCampaign['content']> {
    // Select appropriate framework
    const framework = this.selectMessageFramework(type);
    
    // Generate core components
    const headline = await this.generateHeadline(data, type);
    const summary = await this.generateSummary(data, type);
    const fullStory = await this.generateFullStory(data, type);
    const keyMessages = this.extractKeyMessages(data, framework);
    const callToAction = this.generateCTA(type, data);
    const hashtags = await this.generateHashtags(type, data, 5);
    
    return {
      headline,
      summary,
      fullStory,
      keyMessages,
      callToAction,
      hashtags
    };
  }
  
  private async adaptContentForAudience(
    master: PRCampaign['content'],
    audience: AudienceSegment,
    campaignType: string
  ): Promise<PRCampaign['content']> {
    // Get audience-specific adaptations
    const adaptations = await this.contentEngine.adaptForUserType(
      {
        content: master,
        userType: audience.type,
        context: {
          interests: audience.characteristics.interests,
          values: audience.characteristics.values,
          tone: audience.messaging.tone
        }
      }
    );
    
    return adaptations as PRCampaign['content'];
  }
  
  private async generateChannelVersions(
    master: PRCampaign['content'],
    variations: Record<string, PRCampaign['content']>
  ): Promise<Record<string, any>> {
    const channels: Record<string, any> = {};
    
    // Email version
    channels.email = {
      subject: master.headline,
      preheader: master.summary.substring(0, 100),
      body: this.formatForEmail(master.fullStory),
      cta: master.callToAction
    };
    
    // SMS version (ultra-concise)
    channels.sms = {
      message: `${master.headline.substring(0, 100)}... ${master.callToAction}`,
      link: true
    };
    
    // Social versions
    channels.social = {
      twitter: await this.generateSocialContent('twitter', master.headline, master),
      linkedin: await this.generateSocialContent('linkedin', master.headline, master),
      facebook: await this.generateSocialContent('facebook', master.headline, master),
      instagram: await this.generateSocialContent('instagram', master.headline, master)
    };
    
    return channels;
  }
  
  private extractKeyFacts(event: unknown): any {
    return {
      headline: event.details.achievement,
      value: event.details.value,
      impact: {
        jobsCreated: event.details.jobsCreated || 0,
        indigenousHires: event.details.indigenousHires || 0,
        communityBenefit: event.details.communityBenefit,
        economicImpact: event.details.economicImpact || event.details.value
      }
    };
  }
  
  private async generateQuote(event: any, narrative: any): Promise<unknown> {
    const quote = await this.aiService.generateContent({
      type: 'quote',
      speaker: 'business_leader',
      context: narrative,
      requirements: {
        authentic: true,
        impactful: true,
        length: '2-3 sentences',
        focus: event.type === 'contract_win' ? 'opportunity' : 'community'
      }
    });
    
    return {
      text: quote,
      author: 'Business Leader',
      title: 'CEO'
    };
  }
  
  private determineResponseStrategy(crisis: unknown): string {
    if (crisis.severity === 'critical') return 'acknowledge';
    if (crisis.type === 'negative_media') return 'counter';
    if (crisis.type === 'political') return 'redirect';
    return 'amplify_positive';
  }
  
  private shouldIncludeIndigenousLanguages(type: string): boolean {
    return ['community_impact', 'milestone'].includes(type);
  }
  
  private async addIndigenousTranslations(
    master: PRCampaign['content'],
    variations: Record<string, PRCampaign['content']>
  ): Promise<void> {
    // This would integrate with translation services
    // For now, marking as requiring translation
    master.indigenousTranslations = [
      {
        language: 'Cree',
        headline: '[Requires Translation]',
        summary: '[Requires Translation]'
      }
    ];
  }
  
  private async generateHashtags(
    topic: string,
    data: unknown,
    limit: number
  ): Promise<string[]> {
    const baseHashtags = [
      '#IndigenousBusiness',
      '#EconomicReconciliation',
      '#FirstNationsSuccess'
    ];
    
    const contextHashtags = await this.aiService.generateContent({
      type: 'hashtags',
      topic,
      data,
      count: limit - baseHashtags.length
    });
    
    return [...baseHashtags, ...contextHashtags].slice(0, limit);
  }
  
  private selectMessageFramework(type: string): string[] {
    switch (type) {
      case 'success_story':
      case 'milestone':
        return this.messageFrameworks.success;
      case 'community_impact':
        return this.messageFrameworks.reconciliation;
      default:
        return this.messageFrameworks.economic_empowerment;
    }
  }
  
  private formatForEmail(content: string): string {
    // Convert to HTML with proper formatting
    return content
      .split('\n\n')
      .map(p => `<p>${p}</p>`)
      .join('\n');
  }
  
  private async generateHeadline(data: unknown, type: string): Promise<string> {
    return `Indigenous Business Wins $${(data.value / 1000000).toFixed(1)}M Contract`;
  }
  
  private async generateSummary(data: unknown, type: string): Promise<string> {
    return `${data.businessName} demonstrates the power of Indigenous procurement by securing a major contract, creating jobs and economic opportunities for their community.`;
  }
  
  private async generateFullStory(data: unknown, type: string): Promise<string> {
    return `Full story content would be generated here based on the data and type...`;
  }
  
  private extractKeyMessages(data: unknown, framework: string[]): string[] {
    return framework.map(msg => 
      msg.replace('{{businessName}}', data.businessName || '')
         .replace('{{contractValue}}', `$${data.value || 0}`)
    );
  }
  
  private generateCTA(type: string, data: unknown): string {
    const ctas = {
      success_story: 'Join the platform and access opportunities',
      milestone: 'Be part of the next milestone',
      crisis_response: 'Learn the facts',
      thought_leadership: 'Read the full analysis',
      community_impact: 'See how you can contribute'
    };
    return ctas[type] || 'Learn more';
  }
  
  private shouldIncludeMedia(platform: string, topic: string): boolean {
    return ['instagram', 'facebook', 'twitter'].includes(platform);
  }
  
  private async generateMediaPrompt(topic: string, data: unknown, platform: string): Promise<unknown> {
    return {
      type: 'image',
      prompt: `Professional image showing Indigenous business success, ${topic}, suitable for ${platform}`
    };
  }
  
  private breakIntoThread(content: string, limit: number): string[] {
    const sentences = content.split('. ');
    const thread: string[] = [];
    let current = '';
    
    for (const sentence of sentences) {
      if (current.length + sentence.length > limit - 10) { // Leave room for numbering
        thread.push(current);
        current = sentence + '.';
      } else {
        current += (current ? ' ' : '') + sentence + '.';
      }
    }
    
    if (current) thread.push(current);
    
    return thread.map((tweet, i) => `${i + 1}/${thread.length} ${tweet}`);
  }
  
  private async generateCrisisStatement(crisis: any, strategy: string): Promise<string> {
    return `We are aware of ${crisis.description} and are taking immediate action...`;
  }
  
  private async generateCrisisSocialPosts(crisis: any, strategy: string): Promise<string[]> {
    return [`We're addressing the situation...`];
  }
  
  private async generateInternalBrief(crisis: unknown): Promise<string> {
    return `Internal brief on ${crisis.type}...`;
  }
  
  private async generateCrisisPressRelease(crisis: any, strategy: string): Promise<string> {
    return `For Immediate Release...`;
  }
  
  private async generateCrisisFAQ(crisis: unknown): Promise<any[]> {
    return [];
  }
  
  private async generateStakeholderMessages(crisis: unknown): Promise<Record<string, string>> {
    return {};
  }
  
  private async generateSubheadline(story: SuccessStory): Promise<string> {
    return `Partnership creates ${story.details.impactMetrics.jobsCreated} jobs in ${story.details.location.community}`;
  }
  
  private async generatePressBody(story: SuccessStory): Promise<string[]> {
    return [
      story.narrative.background,
      story.narrative.challenge,
      story.narrative.solution,
      story.narrative.outcome
    ];
  }
  
  private async generateBoilerplate(): Promise<string> {
    return `About Indigenious: The platform connecting Indigenous businesses with procurement opportunities...`;
  }
  
  private formatPressContacts(contacts: string[]): string {
    return contacts.join('\n');
  }
  
  private async generateEditorsNotes(story: SuccessStory): Promise<string[]> {
    return [
      'High-resolution images available upon request',
      'Interview opportunities available'
    ];
  }
}

export default PRContentGenerator;