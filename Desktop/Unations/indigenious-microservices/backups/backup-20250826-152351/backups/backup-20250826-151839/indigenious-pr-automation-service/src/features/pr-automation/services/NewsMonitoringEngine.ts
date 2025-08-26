/**
 * News Monitoring Engine
 * Tracks external news for PR opportunities and narrative hijacking
 * Turns current events into platform promotion opportunities
 */

import { PRContentGenerator } from './PRContentGenerator';
import { logger } from '@/lib/monitoring/logger';
import { CampaignOrchestrator } from './CampaignOrchestrator';
import { NetworkEffectsPRAmplifier } from './NetworkEffectsPRAmplifier';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import { WebFetch } from '@/tools/WebFetch';
import type { PRCampaign } from '../types';

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: Date;
  
  content: {
    summary: string;
    fullText: string;
    quotes: string[];
    keyEntities: string[];
  };
  
  relevance: {
    score: number; // 0-1
    keywords: string[];
    topics: string[];
    sentiment: number;
  };
  
  opportunity: {
    type: 'direct_response' | 'narrative_hijack' | 'counter_narrative' | 'amplification';
    angle: string;
    urgency: 'immediate' | 'short_term' | 'strategic';
    suggestedResponse: string;
  };
}

interface NewsOpportunity {
  newsItem: NewsItem;
  
  response: {
    strategy: 'newsjack' | 'thought_leadership' | 'data_driven' | 'success_story';
    headline: string;
    angle: string;
    keyMessages: string[];
    proofPoints: unknown[]; // Platform data to support narrative
  };
  
  distribution: {
    primaryChannel: 'media' | 'social' | 'direct';
    timing: 'immediate' | 'next_news_cycle' | 'strategic';
    targets: string[]; // Specific journalists, outlets, influencers
  };
  
  expectedImpact: {
    reach: number;
    narrativeShift: number; // How much we can shift the conversation
    brandLift: number;
  };
  
  localContext?: {
    isNearProject: boolean;
    projectName?: string;
    affectedCommunities?: string[];
    localSentiment?: number;
  };
}

interface PredictedStory {
  story: NewsItem;
  viralProbability: number;
  estimatedTimeToNational: number; // hours
  recommendedAction: string;
  projectProximity?: {
    nearestProject: string;
    distance: number; // km
    relevantCommunities: string[];
  };
}

export class NewsMonitoringEngine {
  private static instance: NewsMonitoringEngine;
  
  private contentGenerator = PRContentGenerator.getInstance();
  private campaignOrchestrator = CampaignOrchestrator.getInstance();
  private networkAmplifier = NetworkEffectsPRAmplifier.getInstance();
  
  // Comprehensive news monitoring configuration
  private monitoringKeywords = {
    // Industry sectors
    industries: [
      'mining', 'forestry', 'energy', 'oil and gas', 'O&G', 'pipeline',
      'infrastructure', 'transport', 'transportation', 'construction',
      'engineering', 'architecture', 'consulting', 'law', 'legal services',
      'technology', 'cleantech', 'renewable energy', 'solar', 'wind',
      'logistics', 'supply chain', 'manufacturing', 'telecommunications',
      'healthcare', 'education', 'hospitality', 'tourism', 'retail',
      'natural resources', 'fisheries', 'agriculture', 'environmental services'
    ],
    
    // Indigenous identifiers
    indigenous: [
      'Indigenous', 'First Nation', 'First Nations', 'Aboriginal', 'Native',
      'Métis', 'Inuit', 'Inuk', 'Indian', 'Treaty', 'Band', 'Tribal',
      'Indigenous-led', 'Indigenous-owned', 'community-owned',
      'First Nation community', 'Indigenous community', 'Native American',
      'Indigenous peoples', 'Aboriginal peoples', 'Indigenous business',
      'Aboriginal business', 'First Nations business', 'Indigenous entrepreneur',
      'Indigenous economic', 'Aboriginal economic', 'Indigenous procurement'
    ],
    
    // Policy and legislation
    policy: [
      'Bill C-5', 'C-5', 'C5', '5 percent', '5% target', '5% procurement',
      'UNDRIP', 'TRC', 'Truth and Reconciliation', 'Calls to Action',
      'duty to consult', 'free prior informed consent', 'FPIC',
      'reconciliation', 'economic reconciliation', 'procurement target',
      'set-aside', 'Indigenous procurement strategy', 'PSAB',
      'impact benefit agreement', 'IBA', 'revenue sharing', 'equity stake'
    ],
    
    // Geographic and development
    geographic: [
      'northern development', 'remote community', 'fly-in community',
      'Ring of Fire', 'James Bay', 'Far North', 'Arctic', 'Sub-Arctic',
      'reserve', 'territory', 'traditional territory', 'unceded',
      'Treaty 1', 'Treaty 2', 'Treaty 3', 'Treaty 4', 'Treaty 5',
      'Treaty 6', 'Treaty 7', 'Treaty 8', 'Treaty 9', 'Treaty 10', 'Treaty 11'
    ],
    
    // Business activities
    business: [
      'contract', 'tender', 'RFP', 'RFQ', 'procurement', 'supplier',
      'vendor', 'partnership', 'joint venture', 'consortium',
      'capacity building', 'training', 'certification', 'qualification',
      'bid', 'proposal', 'award', 'project', 'development', 'investment'
    ],
    
    // Competitors and market
    competitors: [
      'CCAB', 'CAMSC', 'Indigenous chamber', 'Aboriginal business directory',
      'NACCA', 'AFI', 'First Nations Finance Authority', 'FNFA',
      'Aboriginal Financial Institutions', 'Indigenous Works', 'AFOA'
    ]
  };
  
  // Generate keyword combinations
  private generateKeywordCombinations(): string[] {
    const combinations: string[] = [];
    
    // Add all individual keywords
    Object.values(this.monitoringKeywords).forEach(category => {
      combinations.push(...category);
    });
    
    // Generate industry + indigenous combinations
    this.monitoringKeywords.industries.forEach(industry => {
      this.monitoringKeywords.indigenous.forEach(indigenous => {
        combinations.push(`${industry} ${indigenous}`);
      });
    });
    
    return combinations;
  }
  
  private newsSourcePriority = {
    // National mainstream media
    'Globe and Mail': 10,
    'CBC': 9,
    'National Post': 8,
    'Toronto Star': 8,
    'Financial Post': 9,
    'BNN Bloomberg': 8,
    'CTV News': 7,
    'Global News': 7,
    'CP24': 6,
    'The Canadian Press': 9,
    'La Presse': 9,
    'Le Devoir': 8,
    'Journal de Montréal': 7,
    'Radio-Canada': 9,
    
    // Indigenous media (highest priority)
    'APTN': 10, // Aboriginal Peoples Television Network
    'Windspeaker': 10,
    'First Nations Drum': 10,
    'The Nation': 10,
    'Nunatsiaq News': 9,
    'Wawatay News': 9,
    'Ha-Shilth-Sa': 9,
    'The Eastern Door': 9,
    'Anishinabek News': 9,
    'Saskatchewan Sage': 9,
    'Turtle Island News': 9,
    'Indigenous Corporate Training': 8,
    
    // Regional papers (Major cities)
    'Vancouver Sun': 7,
    'The Province': 6,
    'Calgary Herald': 7,
    'Calgary Sun': 6,
    'Edmonton Journal': 7,
    'Edmonton Sun': 6,
    'Winnipeg Free Press': 7,
    'Winnipeg Sun': 6,
    'Ottawa Citizen': 7,
    'Ottawa Sun': 6,
    'Montreal Gazette': 7,
    'Le Journal de Montréal': 7,
    'Halifax Chronicle Herald': 6,
    'The Coast': 5,
    'The Telegram': 6,
    'Whitehorse Star': 6,
    'Northern News Services': 8,
    'Nunavut News': 7,
    
    // Quebec regional papers (100K+ reach)
    'Le Nouvelliste': 7, // Trois-Rivières
    'La Tribune': 7, // Sherbrooke
    'Le Quotidien': 7, // Saguenay
    'Le Soleil': 7, // Quebec City
    'La Voix de l\'Est': 6, // Granby
    'Le Droit': 7, // Ottawa-Gatineau
    'L\'Acadie Nouvelle': 6, // New Brunswick
    'Le Journal de Québec': 7,
    
    // Ontario local papers (50K+ cities)
    'The London Free Press': 6,
    'The Windsor Star': 6,
    'The Hamilton Spectator': 6,
    'Waterloo Region Record': 6,
    'St. Catharines Standard': 5,
    'Niagara Falls Review': 5,
    'Kingston Whig-Standard': 5,
    'Peterborough Examiner': 5,
    'The Sudbury Star': 7, // Near Ring of Fire
    'Thunder Bay Chronicle Journal': 8, // Near Ring of Fire
    'Timmins Daily Press': 8, // Mining region
    'North Bay Nugget': 6,
    'Sault Star': 6,
    
    // Western Canada local papers
    'Regina Leader-Post': 6,
    'Saskatoon StarPhoenix': 6,
    'Brandon Sun': 5,
    'Lethbridge Herald': 5,
    'Medicine Hat News': 5,
    'Red Deer Advocate': 5,
    'Fort McMurray Today': 8, // Oil sands
    'Alaska Highway News': 7, // Fort St. John
    'Prince George Citizen': 6,
    'Kamloops This Week': 5,
    'Kelowna Daily Courier': 5,
    'Victoria Times Colonist': 6,
    
    // Atlantic Canada local papers
    'The Guardian': 5, // Charlottetown
    'Cape Breton Post': 6,
    'The Western Star': 5, // Corner Brook
    'The Moncton Times': 5,
    'Saint John Telegraph-Journal': 6,
    
    // Business and trade publications
    'Business in Vancouver': 7,
    'Northern Ontario Business': 8,
    'Canadian Business Journal': 7,
    'Corporate Knights': 6,
    'Canadian Mining Journal': 8,
    'Daily Oil Bulletin': 7,
    'The Lawyer\'s Daily': 8,
    'Canadian Lawyer': 8,
    'Law Times': 7,
    
    // Industry specific
    'Mining.com': 8,
    'JWN Energy': 7,
    'Construction Canada': 7,
    'ReNew Canada': 7,
    'Canadian Forest Industries': 7,
    'Electric Autonomy': 6,
    
    // Online and alternative
    'VICE Canada': 6,
    'The Tyee': 7,
    'The Narwhal': 8,
    'Canada\'s National Observer': 7,
    'Ricochet Media': 6
  };
  
  // Social media monitoring
  private socialMediaPlatforms = [
    'Twitter/X', 'LinkedIn', 'Facebook', 'Instagram', 'YouTube',
    'TikTok', 'Reddit', 'WhatsApp Groups', 'Telegram', 'Discord',
    'Apple News', 'Google News', 'Flipboard', 'Medium', 'Substack'
  ];
  
  // Key influencers and thought leaders
  private keyInfluencers = {
    lawyers: [
      // Law firms with Indigenous law practices
      'OKT Law', 'Mandell Pinder', 'JFK Law', 'Woodward & Company',
      'Ratcliff & Company', 'Donovan & Company', 'First Peoples Law'
    ],
    academics: [
      // Universities with Indigenous business programs
      'Ryerson University', 'University of Victoria', 'University of Winnipeg',
      'First Nations University', 'University of Northern BC'
    ],
    organizations: [
      'Assembly of First Nations', 'Congress of Aboriginal Peoples',
      'Native Women\'s Association', 'National Aboriginal Capital Corporations',
      'Council for the Advancement of Native Development Officers'
    ],
    consultants: [
      'Indigenous Corporate Training', 'NVision Insight Group',
      'Raven Indigenous Capital Partners', 'Indigenomics Institute'
    ]
  };
  
  // Major project locations and nearby media
  private projectProximityMedia = {
    'Ring of Fire': {
      project: 'Ring of Fire mining development',
      location: { lat: 52.75, lng: -86.0 },
      nearbyMedia: [
        'Thunder Bay Chronicle Journal', // ~500km
        'Timmins Daily Press', // ~400km
        'The Sudbury Star', // ~600km
        'North Bay Nugget', // ~700km
        'Wawatay News', // Indigenous, regional
        'Northern Ontario Business' // Regional business
      ],
      communities: ['Webequie', 'Marten Falls', 'Neskantaga', 'Eabametoong', 'Nibinamik']
    },
    'Site C Dam': {
      project: 'Site C Hydroelectric Dam',
      location: { lat: 56.03, lng: -120.85 },
      nearbyMedia: [
        'Alaska Highway News', // Fort St. John
        'Dawson Creek Mirror',
        'Prince George Citizen',
        'Vancouver Sun' // Provincial interest
      ],
      communities: ['West Moberly', 'Prophet River']
    },
    'Trans Mountain Pipeline': {
      project: 'Trans Mountain Pipeline Expansion',
      nearbyMedia: [
        'Vancouver Sun',
        'Kamloops This Week',
        'Edmonton Journal',
        'Calgary Herald'
      ],
      communities: ['Coldwater', 'Tsleil-Waututh', 'Squamish', 'Musqueam']
    },
    'Coastal GasLink': {
      project: 'Coastal GasLink Pipeline',
      nearbyMedia: [
        'Prince George Citizen',
        'Terrace Standard',
        'Houston Today',
        'Burns Lake Lakes District News'
      ],
      communities: ['Wet\'suwet\'en', 'Haisla', 'Lake Babine']
    },
    'Muskrat Falls': {
      project: 'Muskrat Falls Hydroelectric',
      nearbyMedia: [
        'The Telegram',
        'The Western Star',
        'The Labradorian',
        'CBC Newfoundland'
      ],
      communities: ['Innu Nation', 'Nunatsiavut']
    },
    'Oil Sands': {
      project: 'Alberta Oil Sands',
      nearbyMedia: [
        'Fort McMurray Today',
        'Edmonton Journal',
        'Calgary Herald',
        'Daily Oil Bulletin'
      ],
      communities: ['Fort McKay', 'Fort Chipewyan', 'Mikisew Cree', 'Athabasca Chipewyan']
    },
    'James Bay': {
      project: 'James Bay Development',
      nearbyMedia: [
        'The Nation', // Cree newspaper
        'Nunatsiaq News',
        'Le Quotidien',
        'CBC North'
      ],
      communities: ['Cree Nation of Wemindji', 'Cree Nation of Eastmain', 'Cree Nation of Waskaganish']
    }
  };
  
  private constructor() {
    this.startNewsMonitoring();
  }
  
  static getInstance(): NewsMonitoringEngine {
    if (!this.instance) {
      this.instance = new NewsMonitoringEngine();
    }
    return this.instance;
  }
  
  /**
   * Monitor news for opportunities
   */
  async scanNewsLandscape(): Promise<{
    opportunities: NewsOpportunity[];
    threats: NewsItem[];
    trending: string[];
    predictions: PredictedStory[];
  }> {
    // Scan multiple news sources with priority on project proximity
    const newsItems = await this.fetchRelevantNews();
    
    // Analyze each item for opportunities
    const opportunities: NewsOpportunity[] = [];
    const threats: NewsItem[] = [];
    const predictions: PredictedStory[] = [];
    
    for (const item of newsItems) {
      const relevance = await this.analyzeRelevance(item);
      item.relevance = relevance;
      
      // Check if this is a local story likely to go viral
      const viralPotential = await this.predictViralPotential(item);
      if (viralPotential.probability > 0.7) {
        predictions.push({
          story: item,
          viralProbability: viralPotential.probability,
          estimatedTimeToNational: viralPotential.timeToNational,
          recommendedAction: viralPotential.action,
          projectProximity: await this.checkProjectProximity(item)
        });
      }
      
      if (relevance.score > 0.7) {
        const opportunity = await this.identifyOpportunity(item);
        
        if (opportunity) {
          // Enhance opportunity with local insights
          opportunity.localContext = await this.getLocalContext(item);
          opportunities.push(opportunity);
        } else if (relevance.sentiment < 0.3) {
          threats.push(item);
        }
      }
    }
    
    // Identify trending topics
    const trending = this.extractTrendingTopics(newsItems);
    
    // Sort opportunities by impact potential
    opportunities.sort((a, b) => 
      b.expectedImpact.reach * b.expectedImpact.narrativeShift - 
      a.expectedImpact.reach * a.expectedImpact.narrativeShift
    );
    
    return { opportunities, threats, trending, predictions };
  }
  
  /**
   * Respond to specific news story
   */
  async respondToNews(
    newsItem: NewsItem,
    strategy: 'newsjack' | 'thought_leadership' | 'data_driven' | 'success_story'
  ): Promise<{
    campaign: PRCampaign;
    distribution: any;
    expectedOutcome: any;
  }> {
    // Generate response based on strategy
    let response;
    
    switch (strategy) {
      case 'newsjack':
        response = await this.createNewsjackResponse(newsItem);
        break;
      case 'thought_leadership':
        response = await this.createThoughtLeadershipResponse(newsItem);
        break;
      case 'data_driven':
        response = await this.createDataDrivenResponse(newsItem);
        break;
      case 'success_story':
        response = await this.createSuccessStoryResponse(newsItem);
        break;
    }
    
    // Launch rapid response campaign
    const campaign = await this.campaignOrchestrator.launchCampaign(
      'thought_leadership',
      response.data,
      {
        urgent: response.urgent,
        customAudiences: ['media', 'government'],
        metadata: {
          newsResponse: true,
          originalStory: newsItem.url
        }
      }
    );
    
    // Amplify through network
    const amplification = await this.networkAmplifier.createAmplificationStrategy(
      campaign.campaign
    );
    await this.networkAmplifier.executeAmplification(amplification);
    
    // Target specific journalists
    const distribution = await this.targetJournalists(newsItem, response);
    
    return {
      campaign: campaign.campaign,
      distribution,
      expectedOutcome: {
        mediaPickup: distribution.journalists.length * 0.3,
        reach: amplification.predictions.organicReach,
        narrativeImpact: 'high'
      }
    };
  }
  
  /**
   * Create response to C-5 procurement challenges
   */
  async handleC5NewsOpportunity(
    newsContext: {
      headline: string;
      issue: string; // e.g., "difficulty reaching Indigenous businesses"
      source: string;
    }
  ): Promise<{
    response: Response;
    talkingPoints: string[];
    platformProof: any;
  }> {
    // Generate C-5 specific response
    const response = await this.contentGenerator.generateCampaignContent(
      'thought_leadership',
      {
        topic: 'C-5 Indigenous Procurement Solution',
        newsHook: newsContext.headline,
        angle: 'Platform solves Indigenous engagement challenge',
        data: await this.gatherC5ProofPoints()
      },
      [] // Will be filled by campaign orchestrator
    );
    
    // Create talking points
    const talkingPoints = [
      `Our platform has ${await this.getBusinessCount()} verified Indigenous businesses ready for government contracts`,
      `We've facilitated $${await this.getContractValue()}M in contracts, proving the 5% target is achievable`,
      `Average RFQ response time: 48 hours vs traditional 3-week procurement cycles`,
      `Direct access to businesses in remote communities including Ring of Fire region`,
      `Built-in translation for Indigenous languages removes communication barriers`,
      `Community-verified Indigenous ownership prevents fraudulent claims`,
      `Real-time capacity matching ensures businesses can deliver`,
      `Partnership facilitation helps smaller Indigenous businesses team up for large contracts`
    ];
    
    // Gather platform proof points
    const platformProof = {
      stats: {
        totalBusinesses: await this.getBusinessCount(),
        verifiedIndigenous: await this.getVerifiedIndigenousCount(),
        contractsAwarded: await this.getContractsAwarded(),
        totalValue: await this.getContractValue(),
        avgResponseTime: '48 hours',
        remoteBusinesses: await this.getRemoteBusinessCount(),
        successRate: '89%'
      },
      successStories: await this.getRelevantSuccessStories('C-5'),
      testimonials: await this.getGovernmentTestimonials()
    };
    
    return { response, talkingPoints, platformProof };
  }
  
  /**
   * Create Ring of Fire specific response
   */
  async handleRingOfFireNews(
    newsContext: {
      headline: string;
      issue: string;
      stakeholders: string[];
    }
  ): Promise<{
    angle: string;
    content: any;
    localBenefits: any;
  }> {
    const angle = 'Platform enables meaningful Indigenous participation in Ring of Fire development';
    
    const content = await this.contentGenerator.generateCampaignContent(
      'success_story',
      {
        topic: 'Ring of Fire Indigenous Partnerships',
        newsHook: newsContext.headline,
        focus: 'Local Indigenous businesses ready to participate',
        benefits: await this.getRingOfFireBenefits()
      },
      []
    );
    
    const localBenefits = {
      communities: [
        'Webequie First Nation',
        'Marten Falls First Nation',
        'Neskantaga First Nation',
        'Eabametoong First Nation',
        'Nibinamik First Nation'
      ],
      opportunities: {
        directEmployment: '2,000+ jobs',
        businessContracts: '$500M+ in local contracts',
        capacityBuilding: 'Training and certification programs',
        supplyChain: 'Local supplier development'
      },
      platformRole: [
        'Connect local businesses with prime contractors',
        'Facilitate joint ventures between communities',
        'Ensure transparent benefit sharing',
        'Track community impact metrics',
        'Provide payment certainty for local suppliers'
      ]
    };
    
    return { angle, content, localBenefits };
  }
  
  /**
   * Monitor for crisis situations
   */
  async detectNewsCrisis(): Promise<{
    detected: boolean;
    crisis?: {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      articles: NewsItem[];
      recommendedResponse: string;
    };
  }> {
    const negativeNews = await this.scanForNegativeNews();
    
    if (negativeNews.length === 0) {
      return { detected: false };
    }
    
    // Analyze crisis severity
    const severity = this.assessCrisisSeverity(negativeNews);
    
    if (severity === 'low') {
      return { detected: false };
    }
    
    // Determine crisis type
    const crisisType = this.identifyCrisisType(negativeNews);
    
    // Generate response recommendation
    const recommendedResponse = await this.generateCrisisResponse(crisisType, severity);
    
    return {
      detected: true,
      crisis: {
        type: crisisType,
        severity,
        articles: negativeNews,
        recommendedResponse
      }
    };
  }
  
  /**
   * Create instant fact-check response
   */
  async factCheckResponse(
    claim: string,
    source: string
  ): Promise<{
    factCheck: {
      claim: string;
      verdict: 'true' | 'false' | 'misleading' | 'needs_context';
      evidence: unknown[];
      correction: string;
    };
    response: Response;
  }> {
    // Analyze claim
    const claimAnalysis = await this.analyzeClaim(claim);
    
    // Gather evidence from platform data
    const evidence = await this.gatherEvidence(claimAnalysis);
    
    // Determine verdict
    const verdict = this.determineVerdict(claimAnalysis, evidence);
    
    // Generate correction if needed
    const correction = verdict !== 'true' 
      ? await this.generateCorrection(claim, evidence)
      : '';
    
    // Create public response
    const response = await this.contentGenerator.generateCampaignContent(
      'crisis_response',
      {
        type: 'fact_check',
        claim,
        verdict,
        evidence,
        correction
      },
      []
    );
    
    return {
      factCheck: {
        claim,
        verdict,
        evidence,
        correction
      },
      response
    };
  }
  
  /**
   * Private helper methods
   */
  private async fetchRelevantNews(): Promise<NewsItem[]> {
    const news: NewsItem[] = [];
    
    // Fetch from multiple sources
    for (const [source, priority] of Object.entries(this.newsSourcePriority)) {
      try {
        const items = await this.fetchFromSource(source);
        news.push(...items);
      } catch (error) {
        logger.error(`Failed to fetch from ${source}:`, error);
      }
    }
    
    // Filter by keywords and recency
    const allKeywords = this.generateKeywordCombinations();
    const relevant = news.filter(item => {
      const contentLower = (item.headline + ' ' + item.content.summary).toLowerCase();
      
      // Check for keyword combinations
      const hasRelevantContent = this.checkRelevance(contentLower);
      
      const isRecent = Date.now() - item.publishedAt.getTime() < 72 * 3600000; // 72 hours
      
      return hasRelevantContent && isRecent;
    });
    
    return relevant;
  }
  
  private async fetchFromSource(source: string): Promise<NewsItem[]> {
    // In production, would use news APIs or RSS feeds
    // For now, using WebFetch to scrape
    const urls = this.getSourceUrls(source);
    const items: NewsItem[] = [];
    
    for (const url of urls) {
      try {
        const result = await WebFetch.fetch({
          url,
          prompt: `Extract news articles about Indigenous business, procurement, C-5 bill, or Ring of Fire. 
                   Return: headline, summary, publication date, and key quotes.`
        });
        
        // Parse result into NewsItem format
        if (result.content) {
          const parsed = this.parseNewsContent(result.content, source, url);
          items.push(...parsed);
        }
      } catch (error) {
        logger.error(`Failed to fetch ${url}:`, error);
      }
    }
    
    return items;
  }
  
  private getSourceUrls(source: string): string[] {
    const urlMap = {
      // National media
      'CBC': ['https://www.cbc.ca/news/indigenous', 'https://www.cbc.ca/news/business', 'https://www.cbc.ca/news/politics'],
      'Globe and Mail': ['https://www.theglobeandmail.com/business/', 'https://www.theglobeandmail.com/politics/', 'https://www.theglobeandmail.com/canada/'],
      'National Post': ['https://nationalpost.com/news/canada', 'https://nationalpost.com/news/politics'],
      'Financial Post': ['https://financialpost.com/news', 'https://financialpost.com/commodities'],
      
      // Indigenous media
      'APTN': ['https://www.aptnnews.ca/national-news/', 'https://www.aptnnews.ca/topic/business/'],
      'Windspeaker': ['https://windspeaker.com/news', 'https://windspeaker.com/news/business'],
      'The Nation': ['https://www.nationnews.ca/', 'https://www.nationnews.ca/business/'],
      
      // Regional
      'Northern Ontario Business': ['https://www.northernontariobusiness.com/industry-news/mining', 'https://www.northernontariobusiness.com/industry-news/aboriginal-business'],
      'Vancouver Sun': ['https://vancouversun.com/category/news/local-news', 'https://vancouversun.com/category/business'],
      
      // Industry
      'Mining.com': ['https://www.mining.com/tag/canada/', 'https://www.mining.com/tag/first-nations/'],
      'JWN Energy': ['https://www.jwnenergy.com/channel/news/', 'https://www.jwnenergy.com/tag/indigenous/'],
      'The Lawyer\'s Daily': ['https://www.thelawyersdaily.ca/indigenous', 'https://www.thelawyersdaily.ca/corporate']
    };
    
    return urlMap[source] || [];
  }
  
  private parseNewsContent(content: string, source: string, url: string): NewsItem[] {
    // Parse scraped content into structured format
    // This is simplified - in production would use proper parsing
    return [{
      id: `news-${Date.now()}`,
      headline: 'Parsed headline',
      source,
      url,
      publishedAt: new Date(),
      content: {
        summary: content.substring(0, 200),
        fullText: content,
        quotes: [],
        keyEntities: []
      },
      relevance: {
        score: 0,
        keywords: [],
        topics: [],
        sentiment: 0.5
      },
      opportunity: {
        type: 'direct_response',
        angle: '',
        urgency: 'short_term',
        suggestedResponse: ''
      }
    }];
  }
  
  private async analyzeRelevance(item: NewsItem): Promise<NewsItem['relevance']> {
    // Calculate relevance score
    let score = 0;
    const keywords: string[] = [];
    const topics: string[] = [];
    
    // Keyword matching
    for (const keyword of this.monitoringKeywords) {
      if (item.content.fullText.toLowerCase().includes(keyword.toLowerCase())) {
        score += 0.1;
        keywords.push(keyword);
      }
    }
    
    // Topic extraction
    if (item.content.fullText.includes('C-5') || item.content.fullText.includes('5%')) {
      topics.push('Indigenous procurement target');
      score += 0.3;
    }
    
    if (item.content.fullText.includes('Ring of Fire')) {
      topics.push('Resource development');
      score += 0.3;
    }
    
    // Source weight
    score *= (this.newsSourcePriority[item.source] || 5) / 10;
    
    // Sentiment analysis (simplified)
    const sentiment = item.content.fullText.includes('challenge') || 
                     item.content.fullText.includes('difficulty') ? 0.3 : 0.7;
    
    return {
      score: Math.min(score, 1),
      keywords,
      topics,
      sentiment
    };
  }
  
  private async identifyOpportunity(item: NewsItem): Promise<NewsOpportunity | null> {
    // Identify if this news presents an opportunity
    if (item.relevance.topics.includes('Indigenous procurement target')) {
      return this.createProcurementOpportunity(item);
    }
    
    if (item.relevance.topics.includes('Resource development')) {
      return this.createResourceOpportunity(item);
    }
    
    return null;
  }
  
  private async createProcurementOpportunity(item: NewsItem): Promise<NewsOpportunity> {
    return {
      newsItem: item,
      response: {
        strategy: 'data_driven',
        headline: 'Platform Data Shows C-5 Target Is Achievable',
        angle: 'We have the solution to procurement challenges',
        keyMessages: [
          'Verified Indigenous businesses ready to engage',
          'Simplified procurement process',
          'Proven track record of success'
        ],
        proofPoints: await this.gatherProcurementProof()
      },
      distribution: {
        primaryChannel: 'media',
        timing: 'next_news_cycle',
        targets: ['Business reporters', 'Government affairs journalists']
      },
      expectedImpact: {
        reach: 500000,
        narrativeShift: 0.7,
        brandLift: 0.3
      }
    };
  }
  
  private async createResourceOpportunity(item: NewsItem): Promise<NewsOpportunity> {
    return {
      newsItem: item,
      response: {
        strategy: 'success_story',
        headline: 'Indigenous Businesses Ready for Ring of Fire Opportunities',
        angle: 'Platform connects local businesses with major projects',
        keyMessages: [
          'Local capacity exists',
          'Partnership facilitation available',
          'Community benefits tracked transparently'
        ],
        proofPoints: await this.gatherResourceProof()
      },
      distribution: {
        primaryChannel: 'direct',
        timing: 'immediate',
        targets: ['Mining reporters', 'Indigenous media', 'Local outlets']
      },
      expectedImpact: {
        reach: 300000,
        narrativeShift: 0.6,
        brandLift: 0.4
      }
    };
  }
  
  private extractTrendingTopics(items: NewsItem[]): string[] {
    const topicCounts: Record<string, number> = {};
    
    items.forEach(item => {
      item.relevance.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }
  
  private async createNewsjackResponse(item: NewsItem): Promise<unknown> {
    return {
      data: {
        newsHook: item.headline,
        ourAngle: 'Platform provides immediate solution',
        proof: await this.gatherPlatformStats()
      },
      urgent: true
    };
  }
  
  private async createThoughtLeadershipResponse(item: NewsItem): Promise<unknown> {
    return {
      data: {
        topic: item.relevance.topics[0],
        expertise: 'Indigenous procurement innovation',
        insights: await this.generateInsights(item)
      },
      urgent: false
    };
  }
  
  private async createDataDrivenResponse(item: NewsItem): Promise<unknown> {
    return {
      data: {
        claim: 'Data proves Indigenous procurement success',
        statistics: await this.gatherPlatformStats(),
        visualization: 'infographic'
      },
      urgent: true
    };
  }
  
  private async createSuccessStoryResponse(item: NewsItem): Promise<unknown> {
    const relevantStory = await this.findRelevantSuccessStory(item);
    return {
      data: relevantStory,
      urgent: false
    };
  }
  
  private async targetJournalists(item: NewsItem, response: Response): Promise<unknown> {
    // Find journalists who cover this beat
    const journalists = await this.findBeatJournalists(item.relevance.topics);
    
    return {
      journalists,
      method: 'direct_pitch',
      exclusive: journalists.length < 3
    };
  }
  
  // Data gathering methods
  private async gatherC5ProofPoints(): Promise<unknown> {
    return {
      businessesReady: await this.getBusinessCount(),
      contractsCompleted: await this.getContractsAwarded(),
      avgTurnaround: '48 hours',
      successRate: '89%'
    };
  }
  
  private async getBusinessCount(): Promise<number> {
    // Would query database
    return 3847;
  }
  
  private async getVerifiedIndigenousCount(): Promise<number> {
    return 3214;
  }
  
  private async getContractsAwarded(): Promise<number> {
    return 892;
  }
  
  private async getContractValue(): Promise<number> {
    return 285; // millions
  }
  
  private async getRemoteBusinessCount(): Promise<number> {
    return 743;
  }
  
  private async getRelevantSuccessStories(topic: string): Promise<any[]> {
    return [];
  }
  
  private async getGovernmentTestimonials(): Promise<any[]> {
    return [];
  }
  
  private async getRingOfFireBenefits(): Promise<unknown> {
    return {
      localEmployment: 2000,
      businessOpportunities: 500000000,
      communityInvestment: 50000000
    };
  }
  
  private async scanForNegativeNews(): Promise<NewsItem[]> {
    const news = await this.fetchRelevantNews();
    return news.filter(item => item.relevance.sentiment < 0.3);
  }
  
  private assessCrisisSeverity(items: NewsItem[]): 'low' | 'medium' | 'high' | 'critical' {
    const avgSentiment = items.reduce((sum, item) => sum + item.relevance.sentiment, 0) / items.length;
    const highProfileSources = items.filter(item => this.newsSourcePriority[item.source] >= 8).length;
    
    if (highProfileSources >= 3 && avgSentiment < 0.2) return 'critical';
    if (highProfileSources >= 2 && avgSentiment < 0.3) return 'high';
    if (items.length >= 3) return 'medium';
    return 'low';
  }
  
  private identifyCrisisType(items: NewsItem[]): string {
    // Analyze common themes in negative news
    return 'procurement_criticism';
  }
  
  private async generateCrisisResponse(type: string, severity: string): Promise<string> {
    return `Immediate ${severity} response required for ${type}`;
  }
  
  private async analyzeClaim(claim: string): Promise<unknown> {
    return { type: 'procurement_claim', entities: [], assertions: [] };
  }
  
  private async gatherEvidence(analysis: unknown): Promise<any[]> {
    return [];
  }
  
  private determineVerdict(analysis: any, evidence: unknown[]): 'true' | 'false' | 'misleading' | 'needs_context' {
    return 'needs_context';
  }
  
  private async generateCorrection(claim: string, evidence: unknown[]): Promise<string> {
    return 'The claim requires additional context...';
  }
  
  private async gatherPlatformStats(): Promise<unknown> {
    return {
      totalBusinesses: 3847,
      contractValue: 285000000,
      successRate: 0.89
    };
  }
  
  private async gatherProcurementProof(): Promise<any[]> {
    return [];
  }
  
  private async gatherResourceProof(): Promise<any[]> {
    return [];
  }
  
  private async generateInsights(item: NewsItem): Promise<string[]> {
    return [
      'Indigenous procurement is accelerating',
      'Technology bridges the engagement gap',
      'Community verification prevents fraud'
    ];
  }
  
  private async findRelevantSuccessStory(item: NewsItem): Promise<unknown> {
    return {
      businessName: 'Example Indigenous Business',
      achievement: 'Won major contract',
      relevance: item.relevance.topics[0]
    };
  }
  
  private async findBeatJournalists(topics: string[]): Promise<any[]> {
    return [
      { name: 'John Doe', outlet: 'Globe and Mail', email: 'jdoe@globeandmail.com' }
    ];
  }
  
  private startNewsMonitoring(): void {
    // Scan news every 30 minutes
    setInterval(() => {
      this.scanNewsLandscape().catch((error) => logger.error('News scanning error:', error));
    }, 1800000);
    
    // Check for crisis every 15 minutes
    setInterval(() => {
      this.detectNewsCrisis().catch((error) => logger.error('Crisis detection error:', error));
    }, 900000);
  }
  
  /**
   * Check content relevance using keyword combinations
   */
  private checkRelevance(content: string): boolean {
    // Must have at least one industry/sector keyword
    const hasIndustry = this.monitoringKeywords.industries.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Must have at least one Indigenous identifier
    const hasIndigenous = this.monitoringKeywords.indigenous.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Or has policy/geographic relevance
    const hasPolicy = this.monitoringKeywords.policy.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    const hasGeographic = this.monitoringKeywords.geographic.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Relevant if: (Industry + Indigenous) OR Policy OR (Geographic + Indigenous)
    return (hasIndustry && hasIndigenous) || hasPolicy || (hasGeographic && hasIndigenous);
  }
  
  /**
   * Predict if a local story will go viral/national
   */
  private async predictViralPotential(item: NewsItem): Promise<{
    probability: number;
    timeToNational: number;
    action: string;
  }> {
    let probability = 0;
    let timeToNational = 168; // Default 1 week
    
    // Check source credibility and reach
    const sourcePriority = this.newsSourcePriority[item.source] || 5;
    probability += sourcePriority * 0.05;
    
    // Check if near major project (high viral potential)
    const projectProximity = await this.checkProjectProximity(item);
    if (projectProximity) {
      probability += 0.3;
      timeToNational = 48; // 2 days for project-related news
    }
    
    // Check for controversy indicators
    const controversyScore = this.detectControversy(item);
    probability += controversyScore * 0.4;
    if (controversyScore > 0.5) {
      timeToNational = 24; // Controversial stories spread fast
    }
    
    // Check for government/policy connection
    if (item.content.fullText.match(/minister|government|federal|provincial|bill|legislation/i)) {
      probability += 0.2;
      timeToNational = Math.min(timeToNational, 72);
    }
    
    // Check emotional content
    const emotionalScore = this.analyzeEmotionalContent(item);
    probability += emotionalScore * 0.2;
    
    // Determine action based on probability
    let action = 'monitor';
    if (probability > 0.8) {
      action = 'immediate_response_prepare_amplification';
    } else if (probability > 0.6) {
      action = 'prepare_response_monitor_closely';
    } else if (probability > 0.4) {
      action = 'draft_response_standby';
    }
    
    return {
      probability: Math.min(probability, 0.95),
      timeToNational,
      action
    };
  }
  
  /**
   * Check if news is near a major project
   */
  private async checkProjectProximity(item: NewsItem): Promise<{
    nearestProject: string;
    distance: number;
    relevantCommunities: string[];
  } | null> {
    // Check each project's media sources
    for (const [projectName, projectData] of Object.entries(this.projectProximityMedia)) {
      if (projectData.nearbyMedia.includes(item.source)) {
        return {
          nearestProject: projectName,
          distance: 0, // Direct coverage
          relevantCommunities: projectData.communities
        };
      }
      
      // Check if content mentions the project
      if (item.content.fullText.toLowerCase().includes(projectName.toLowerCase()) ||
          item.content.fullText.toLowerCase().includes(projectData.project.toLowerCase())) {
        return {
          nearestProject: projectName,
          distance: 0,
          relevantCommunities: projectData.communities
        };
      }
      
      // Check if any communities are mentioned
      for (const community of projectData.communities) {
        if (item.content.fullText.toLowerCase().includes(community.toLowerCase())) {
          return {
            nearestProject: projectName,
            distance: 50, // Approximate
            relevantCommunities: [community]
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get local context for a news item
   */
  private async getLocalContext(item: NewsItem): Promise<NewsOpportunity['localContext']> {
    const projectProximity = await this.checkProjectProximity(item);
    
    if (projectProximity) {
      // Analyze local sentiment based on source
      const localSentiment = await this.analyzeLocalSentiment(item, projectProximity.relevantCommunities);
      
      return {
        isNearProject: true,
        projectName: projectProximity.nearestProject,
        affectedCommunities: projectProximity.relevantCommunities,
        localSentiment
      };
    }
    
    return {
      isNearProject: false
    };
  }
  
  /**
   * Detect controversy indicators
   */
  private detectControversy(item: NewsItem): number {
    let score = 0;
    
    const controversyKeywords = [
      'protest', 'opposition', 'blockade', 'lawsuit', 'injunction',
      'conflict', 'dispute', 'controversy', 'scandal', 'investigation',
      'corruption', 'mismanagement', 'failure', 'crisis', 'emergency',
      'violation', 'breach', 'illegal', 'unauthorized', 'contamination'
    ];
    
    const content = item.content.fullText.toLowerCase();
    
    for (const keyword of controversyKeywords) {
      if (content.includes(keyword)) {
        score += 0.15;
      }
    }
    
    // Check for Indigenous rights specific controversies
    if (content.match(/duty to consult|free.*prior.*informed.*consent|unceded|treaty.*rights|land.*rights/i)) {
      score += 0.3;
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Analyze emotional content
   */
  private analyzeEmotionalContent(item: NewsItem): number {
    let score = 0;
    
    const emotionalTriggers = {
      positive: [
        'breakthrough', 'historic', 'milestone', 'success', 'achievement',
        'celebration', 'victory', 'pioneering', 'first', 'largest',
        'record', 'unprecedented', 'inspiring', 'empowering'
      ],
      negative: [
        'tragedy', 'disaster', 'crisis', 'failure', 'collapse',
        'devastating', 'shocking', 'outrage', 'scandal', 'betrayal',
        'injustice', 'discrimination', 'racism', 'exploitation'
      ]
    };
    
    const content = item.content.fullText.toLowerCase();
    
    // Positive emotions spread differently than negative
    for (const word of emotionalTriggers.positive) {
      if (content.includes(word)) {
        score += 0.08;
      }
    }
    
    for (const word of emotionalTriggers.negative) {
      if (content.includes(word)) {
        score += 0.12; // Negative spreads faster
      }
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Analyze local sentiment
   */
  private async analyzeLocalSentiment(
    item: NewsItem,
    communities: string[]
  ): Promise<number> {
    // Base sentiment from article
    let sentiment = item.relevance.sentiment;
    
    // Adjust based on source type
    if (item.source.includes('Indigenous') || item.source.includes('First Nations')) {
      // Indigenous media sentiment weighs more heavily
      sentiment = sentiment * 1.2;
    }
    
    // Check for community-specific mentions
    for (const community of communities) {
      if (item.content.fullText.includes(community)) {
        // Direct community mention affects sentiment interpretation
        if (item.content.fullText.match(new RegExp(`${community}.*(support|approve|welcome|partner)`, 'i'))) {
          sentiment += 0.2;
        } else if (item.content.fullText.match(new RegExp(`${community}.*(oppose|reject|concern|protest)`, 'i'))) {
          sentiment -= 0.3;
        }
      }
    }
    
    return Math.max(0, Math.min(1, sentiment));
  }
  
  /**
   * Monitor news from local sources near projects
   */
  async monitorProjectProximityNews(): Promise<{
    projectUpdates: Array<{
      project: string;
      newsItems: NewsItem[];
      sentiment: number;
      riskLevel: 'low' | 'medium' | 'high';
      recommendations: string[];
    }>;
  }> {
    const projectUpdates = [];
    
    for (const [projectName, projectData] of Object.entries(this.projectProximityMedia)) {
      const newsItems: NewsItem[] = [];
      
      // Fetch news from each nearby source
      for (const source of projectData.nearbyMedia) {
        try {
          const items = await this.fetchFromSource(source);
          newsItems.push(...items);
        } catch (error) {
          logger.error(`Failed to fetch from ${source}:`, error);
        }
      }
      
      if (newsItems.length > 0) {
        // Analyze project-specific news
        const sentiment = newsItems.reduce((sum, item) => sum + (item.relevance?.sentiment || 0.5), 0) / newsItems.length;
        const riskLevel = sentiment < 0.3 ? 'high' : sentiment < 0.5 ? 'medium' : 'low';
        
        const recommendations = [];
        if (riskLevel === 'high') {
          recommendations.push('Launch immediate positive narrative campaign');
          recommendations.push('Engage with affected communities directly');
          recommendations.push('Prepare crisis response materials');
        } else if (riskLevel === 'medium') {
          recommendations.push('Increase positive content about project benefits');
          recommendations.push('Monitor situation closely');
        }
        
        projectUpdates.push({
          project: projectName,
          newsItems,
          sentiment,
          riskLevel,
          recommendations
        });
      }
    }
    
    return { projectUpdates };
  }
}

export default NewsMonitoringEngine;