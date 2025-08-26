/**
 * PR Automation Types
 * Defines structures for the self-operating propaganda machine
 * Amplifies Indigenous success stories and platform achievements
 */

export interface PRCampaign {
  id: string;
  name: string;
  type: 'success_story' | 'milestone' | 'crisis_response' | 'thought_leadership' | 'community_impact';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  
  // Content
  content: {
    headline: string;
    summary: string;
    fullStory: string;
    keyMessages: string[];
    callToAction: string;
    hashtags: string[];
    indigenousTranslations?: {
      language: string;
      headline: string;
      summary: string;
    }[];
  };
  
  // Targeting
  audience: {
    primary: AudienceSegment[];
    secondary: AudienceSegment[];
    geographic: string[]; // provinces/territories
    languages: string[];
  };
  
  // Distribution
  channels: {
    email: boolean;
    sms: boolean;
    socialMedia: {
      twitter: boolean;
      linkedin: boolean;
      facebook: boolean;
      instagram: boolean;
    };
    pressRelease: boolean;
    website: boolean;
  };
  
  // Timing
  schedule: {
    launchDate: Date;
    endDate?: Date;
    optimalTimes: string[]; // AI-determined best posting times
    frequency?: 'once' | 'daily' | 'weekly';
  };
  
  // Performance
  metrics: {
    reach: number;
    engagement: number;
    mediaPickup: number;
    sentimentScore: number;
    conversions: number; // new signups/RFQs
  };
  
  // Compliance
  approval: {
    required: boolean;
    approvers: string[];
    status: 'pending' | 'approved' | 'rejected';
    comments?: string[];
  };
}

export interface AudienceSegment {
  id: string;
  name: string;
  type: 'media' | 'government' | 'indigenous_leader' | 'business' | 'investor' | 'general_public';
  
  characteristics: {
    interests: string[];
    values: string[];
    painPoints: string[];
    preferredChannels: string[];
    engagementLevel: 'high' | 'medium' | 'low';
  };
  
  contacts: {
    count: number;
    verified: number;
    highValue: string[]; // IDs of key influencers
  };
  
  messaging: {
    tone: 'formal' | 'conversational' | 'inspirational' | 'urgent';
    themes: string[];
    avoidTopics: string[];
  };
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: 'email' | 'social_post' | 'press_release' | 'sms';
  category: PRCampaign['type'];
  
  structure: {
    sections: Array<{
      type: 'headline' | 'intro' | 'body' | 'quote' | 'stats' | 'cta';
      content: string;
      variables: string[]; // {{businessName}}, {{contractValue}}, etc.
    }>;
    maxLength?: number;
    requiredElements: string[];
  };
  
  variations: {
    audienceType: Record<string, any>; // Variations per audience
    channel: Record<string, any>; // Variations per channel
    language: Record<string, any>; // Translations
  };
  
  performance: {
    usageCount: number;
    avgEngagement: number;
    successRate: number;
  };
}

export interface MediaOutlet {
  id: string;
  name: string;
  type: 'newspaper' | 'tv' | 'radio' | 'online' | 'podcast' | 'blog';
  
  profile: {
    circulation: number;
    audience: string;
    focus: string[]; // business, Indigenous affairs, tech, etc.
    geography: string[]; // coverage areas
    language: string[];
  };
  
  contacts: Array<{
    name: string;
    role: string;
    email: string;
    phone?: string;
    preferences: {
      topics: string[];
      format: string[]; // email, phone, in-person
      timing: string; // deadline times
      doNotContact?: boolean;
    };
    relationship: {
      lastContact?: Date;
      storiesPublished: number;
      responseRate: number;
      sentiment: 'positive' | 'neutral' | 'negative';
    };
  }>;
  
  engagement: {
    storiesPitched: number;
    storiesPublished: number;
    avgTurnaround: number; // hours
    preferredFormat: string;
  };
}

export interface SuccessStory {
  id: string;
  type: 'contract_win' | 'partnership' | 'milestone' | 'community_impact' | 'innovation';
  
  // Core details
  details: {
    businessName: string;
    businessId: string;
    achievement: string;
    value?: number; // dollar value if applicable
    impactMetrics: {
      jobsCreated?: number;
      indigenousHires?: number;
      communityBenefit?: string;
      economicImpact?: number;
    };
    date: Date;
    location: {
      community?: string;
      province: string;
      onReserve: boolean;
    };
  };
  
  // Story elements
  narrative: {
    background: string;
    challenge: string;
    solution: string;
    outcome: string;
    quote?: {
      text: string;
      author: string;
      title: string;
    };
    visualAssets?: {
      photos: string[];
      videos: string[];
      infographics: string[];
    };
  };
  
  // Permissions
  consent: {
    obtained: boolean;
    date?: Date;
    restrictions?: string[];
    expiryDate?: Date;
  };
  
  // Distribution
  usage: {
    campaigns: string[]; // campaign IDs
    publishedChannels: string[];
    mediaPickup: MediaMention[];
    totalReach: number;
  };
}

export interface MediaMention {
  id: string;
  outlet: string;
  date: Date;
  type: 'article' | 'interview' | 'mention' | 'feature';
  
  details: {
    headline?: string;
    url?: string;
    author?: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    reach: number;
    shareOfVoice: number; // percentage of coverage
  };
  
  content: {
    summary: string;
    keyMessages: string[];
    quotes: string[];
    visualsUsed: boolean;
  };
  
  impact: {
    websiteTraffic: number;
    socialShares: number;
    leadGeneration: number;
    followUpOpportunities: string[];
  };
}

export interface CrisisEvent {
  id: string;
  type: 'negative_media' | 'platform_issue' | 'political' | 'economic' | 'social';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  trigger: {
    source: string;
    description: string;
    timestamp: Date;
    affectedParties: string[];
  };
  
  response: {
    strategy: 'acknowledge' | 'counter' | 'redirect' | 'amplify_positive';
    messages: {
      primary: string;
      supporting: string[];
      defensive: string[];
    };
    actions: Array<{
      type: string;
      description: string;
      responsible: string;
      deadline: Date;
      status: 'pending' | 'completed';
    }>;
  };
  
  monitoring: {
    sentimentTrend: Array<{
      timestamp: Date;
      score: number;
    }>;
    mediaVolume: number;
    socialChatter: number;
    resolved: boolean;
  };
}

export interface PRAutomationRule {
  id: string;
  name: string;
  active: boolean;
  
  trigger: {
    type: 'event' | 'metric' | 'schedule' | 'external';
    conditions: Array<{
      field: string;
      operator: 'equals' | 'greater' | 'less' | 'contains';
      value: unknown;
    }>;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  
  actions: Array<{
    type: 'generate_content' | 'send_campaign' | 'alert_team' | 'create_story';
    parameters: Record<string, any>;
    delay?: number; // minutes
  }>;
  
  filters: {
    minValue?: number; // Don't trigger for small wins
    geography?: string[];
    businessType?: string[];
    cooldown?: number; // hours between triggers
  };
  
  performance: {
    lastTriggered?: Date;
    triggerCount: number;
    successRate: number;
    avgEngagement: number;
  };
}

export interface SocialMediaAccount {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  handle: string;
  
  credentials: {
    accessToken: string; // encrypted
    refreshToken?: string;
    expiresAt?: Date;
    scopes: string[];
  };
  
  profile: {
    followers: number;
    engagement: number;
    growthRate: number;
    audienceDemographics: Record<string, any>;
  };
  
  activity: {
    lastPost?: Date;
    totalPosts: number;
    avgEngagement: number;
    topPosts: Array<{
      id: string;
      content: string;
      engagement: number;
      date: Date;
    }>;
  };
  
  automation: {
    autoPost: boolean;
    autoReply: boolean;
    autoFollow: boolean;
    scheduledPosts: Array<{
      content: string;
      mediaUrls?: string[];
      scheduleTime: Date;
    }>;
  };
}

// Intelligence gathering
export interface MarketIntelligence {
  competitorActivity: Array<{
    competitor: string;
    action: string;
    impact: 'threat' | 'opportunity' | 'neutral';
    suggestedResponse?: string;
  }>;
  
  trendingTopics: Array<{
    topic: string;
    volume: number;
    sentiment: number;
    relevance: number;
    suggestedAngle?: string;
  }>;
  
  upcomingEvents: Array<{
    event: string;
    date: Date;
    significance: 'high' | 'medium' | 'low';
    preparationNeeded: string[];
  }>;
  
  politicalLandscape: {
    supportiveVoices: string[];
    opposition: string[];
    neutralInfluencers: string[];
    keyIssues: string[];
  };
}

// Metrics and analytics
export interface PRMetrics {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  
  reach: {
    total: number;
    organic: number;
    paid: number;
    earned: number; // media coverage
  };
  
  engagement: {
    total: number;
    byChannel: Record<string, number>;
    byContent: Record<string, number>;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  
  conversion: {
    websiteVisits: number;
    signups: number;
    rfqsCreated: number;
    contractsWon: number;
    attributedRevenue: number;
  };
  
  media: {
    mentions: number;
    reach: number;
    shareOfVoice: number;
    topOutlets: Array<{
      outlet: string;
      mentions: number;
      sentiment: number;
    }>;
  };
  
  roi: {
    investmentCost: number;
    mediaValue: number;
    businessValue: number;
    totalROI: number;
  };
}