// Business Hunter Swarm Orchestrator
import { WebCrawlerAgent, SocialMediaCrawlerAgent, NewsCrawlerAgent, IndustryAssociationCrawler } from './web-crawler';

export interface DiscoveredBusiness {
  id: string;
  name: string;
  type: 'indigenous_owned' | 'bill_c5_ready' | 'potential_partner';
  confidence: number; // 0-100 confidence score
  sources: string[]; // Where we found them
  industry?: string;
  location?: string;
  contactInfo?: {
    emails?: string[];
    phones?: string[];
    website?: string;
    socialMedia?: Record<string, string>;
  };
  indigenousIndicators?: string[];
  verificationStatus: 'unverified' | 'pending' | 'verified';
  discoveredAt: Date;
  lastUpdated: Date;
}

export class BusinessHunterSwarm {
  private webCrawler: WebCrawlerAgent;
  private socialCrawler: SocialMediaCrawlerAgent;
  private newsCrawler: NewsCrawlerAgent;
  private industryCrawler: IndustryAssociationCrawler;
  
  private discoveredBusinesses: Map<string, DiscoveredBusiness> = new Map();
  private crawlQueue: string[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.webCrawler = new WebCrawlerAgent();
    this.socialCrawler = new SocialMediaCrawlerAgent();
    this.newsCrawler = new NewsCrawlerAgent();
    this.industryCrawler = new IndustryAssociationCrawler();
  }

  async initialize() {
    await this.webCrawler.initialize();
    console.log('🎯 Business Hunter Swarm initialized');
  }

  async startHunting(config: {
    industries: string[];
    provinces: string[];
    focusOnIndigenous: boolean;
    targetCount: number;
  }) {
    this.isRunning = true;
    console.log('🔍 Starting business hunt with config:', config);

    // Generate search queries based on config
    const searchQueries = this.generateSearchQueries(config);
    
    // Launch multiple agents in parallel
    const huntingTasks = [
      this.webSearchHunt(searchQueries),
      this.governmentSiteHunt(),
      this.socialMediaHunt(config.industries),
      this.newsHunt(),
      this.industryDirectoryHunt(config.industries)
    ];

    // Run all hunting tasks concurrently
    await Promise.all(huntingTasks);

    // Process and verify discovered businesses
    await this.processDiscoveredBusinesses();

    return {
      discovered: this.discoveredBusinesses.size,
      businesses: Array.from(this.discoveredBusinesses.values())
    };
  }

  private generateSearchQueries(config: any): string[] {
    const queries = [];
    const { industries, provinces, focusOnIndigenous } = config;

    // Base terms
    const businessTerms = ['company', 'corporation', 'enterprise', 'ltd', 'inc'];
    const indigenousTerms = ['Indigenous', 'Aboriginal', 'First Nations', 'Métis', 'Inuit'];
    const billC5Terms = ['Bill C-5', 'federal contractor', 'government supplier', 'PSPC registered'];

    // Generate combinations
    for (const industry of industries) {
      for (const province of provinces) {
        if (focusOnIndigenous) {
          for (const indigenousTerm of indigenousTerms) {
            queries.push(`${indigenousTerm} ${industry} ${province} Canada`);
            queries.push(`${indigenousTerm} owned ${industry} business ${province}`);
          }
        }
        
        // Bill C-5 related searches
        queries.push(`${industry} ${billC5Terms[0]} supplier ${province}`);
        queries.push(`${industry} government contractor ${province} Canada`);
        
        // General industry searches
        queries.push(`${industry} companies ${province} Canada directory`);
        queries.push(`top ${industry} businesses ${province}`);
      }
    }

    return queries;
  }

  private async webSearchHunt(queries: string[]) {
    console.log('🌐 Web search agent hunting...');
    
    for (const query of queries) {
      if (!this.isRunning) break;
      
      try {
        const results = await this.webCrawler.searchBusinesses(query);
        
        for (const result of results) {
          // Extract business info from each result
          const businessInfo = await this.webCrawler.extractBusinessInfo(result.link);
          
          if (businessInfo && this.isLikelyBusiness(businessInfo)) {
            this.addDiscoveredBusiness({
              name: businessInfo.title,
              url: result.link,
              snippet: result.snippet,
              ...businessInfo
            });
          }
        }
        
        // Rate limiting
        await this.delay(3000 + Math.random() * 5000);
      } catch (error) {
        console.error('Web search error:', error);
      }
    }
  }

  private async governmentSiteHunt() {
    console.log('🏛️ Government site agent hunting...');
    
    try {
      const businesses = await this.webCrawler.scanGovernmentSites();
      
      for (const business of businesses) {
        this.addDiscoveredBusiness({
          name: business.name,
          url: business.link,
          source: 'government_directory',
          confidence: 90 // High confidence from government sources
        });
      }
    } catch (error) {
      console.error('Government site hunt error:', error);
    }
  }

  private async socialMediaHunt(industries: string[]) {
    console.log('📱 Social media agent hunting...');
    
    // Hunt on LinkedIn
    for (const industry of industries) {
      try {
        const linkedInResults = await this.webCrawler.findBusinessesOnLinkedIn(industry);
        
        for (const result of linkedInResults) {
          this.addDiscoveredBusiness({
            name: result.name,
            url: result.link,
            source: 'linkedin',
            description: result.description,
            location: result.location
          });
        }
      } catch (error) {
        console.error('LinkedIn hunt error:', error);
      }
    }

    // Hunt on other social platforms
    const twitterResults = await this.socialCrawler.searchTwitter(industries);
    const facebookResults = await this.socialCrawler.searchFacebook(industries.join(' '));
    
    // Process social media results
    [...twitterResults, ...facebookResults].forEach(result => {
      this.addDiscoveredBusiness(result);
    });
  }

  private async newsHunt() {
    console.log('📰 News crawler agent hunting...');
    
    const newsResults = await this.newsCrawler.findBusinessAnnouncements();
    
    for (const result of newsResults) {
      this.addDiscoveredBusiness({
        ...result,
        source: 'news',
        confidence: 70 // Medium confidence from news sources
      });
    }
  }

  private async industryDirectoryHunt(industries: string[]) {
    console.log('🏭 Industry directory agent hunting...');
    
    for (const industry of industries) {
      try {
        const members = await this.industryCrawler.crawlMemberDirectories(industry);
        
        for (const member of members) {
          this.addDiscoveredBusiness({
            ...member,
            source: 'industry_association',
            confidence: 85 // High confidence from industry associations
          });
        }
      } catch (error) {
        console.error(`Industry directory hunt error for ${industry}:`, error);
      }
    }
  }

  private isLikelyBusiness(info: any): boolean {
    // Validate if this is likely a real business
    const hasBusinessIndicators = 
      info.emails?.length > 0 || 
      info.phones?.length > 0 ||
      info.addresses?.length > 0 ||
      info.detectedIndustry !== 'unknown';
    
    // Check for spam/directory sites
    const spamIndicators = [
      'directory', 'listing', 'yellowpages', 'yelp', 'indeed'
    ];
    
    const isSpam = spamIndicators.some(indicator => 
      info.title?.toLowerCase().includes(indicator) ||
      info.url?.toLowerCase().includes(indicator)
    );
    
    return hasBusinessIndicators && !isSpam;
  }

  private addDiscoveredBusiness(data: any) {
    // Generate unique ID based on name and location
    const id = this.generateBusinessId(data.name, data.location);
    
    // Check if we already have this business
    if (this.discoveredBusinesses.has(id)) {
      // Update existing entry with new information
      const existing = this.discoveredBusinesses.get(id)!;
      existing.sources.push(data.source || 'web');
      existing.lastUpdated = new Date();
      
      // Merge contact info
      if (data.emails) {
        existing.contactInfo = existing.contactInfo || {};
        existing.contactInfo.emails = [...new Set([
          ...(existing.contactInfo.emails || []),
          ...data.emails
        ])];
      }
      
      return;
    }
    
    // Determine business type based on indicators
    let type: 'indigenous_owned' | 'bill_c5_ready' | 'potential_partner' = 'potential_partner';
    let confidence = data.confidence || 50;
    
    if (data.hasIndigenousIndicators) {
      type = 'indigenous_owned';
      confidence = Math.max(confidence, 75);
    } else if (data.source === 'government_directory' || data.snippet?.includes('Bill C-5')) {
      type = 'bill_c5_ready';
      confidence = Math.max(confidence, 70);
    }
    
    // Create new business entry
    const business: DiscoveredBusiness = {
      id,
      name: data.name,
      type,
      confidence,
      sources: [data.source || 'web'],
      industry: data.detectedIndustry || data.industry,
      location: data.location || this.extractProvince(data.addresses?.[0]),
      contactInfo: {
        emails: data.emails,
        phones: data.phones,
        website: data.url,
        socialMedia: data.socialLinks
      },
      indigenousIndicators: data.indigenousIndicators,
      verificationStatus: 'unverified',
      discoveredAt: new Date(),
      lastUpdated: new Date()
    };
    
    this.discoveredBusinesses.set(id, business);
    console.log(`✅ Discovered: ${business.name} (${business.type})`);
  }

  private generateBusinessId(name: string, location?: string): string {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const locationPart = location?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    return `${normalized}-${locationPart}`.substring(0, 50);
  }

  private extractProvince(address?: string): string | undefined {
    if (!address) return undefined;
    
    const provinces = {
      'ON': 'Ontario', 'BC': 'British Columbia', 'AB': 'Alberta',
      'QC': 'Quebec', 'MB': 'Manitoba', 'SK': 'Saskatchewan',
      'NS': 'Nova Scotia', 'NB': 'New Brunswick', 'PE': 'Prince Edward Island',
      'NL': 'Newfoundland and Labrador', 'YT': 'Yukon', 'NT': 'Northwest Territories',
      'NU': 'Nunavut'
    };
    
    for (const [code, name] of Object.entries(provinces)) {
      if (address.includes(code) || address.includes(name)) {
        return code;
      }
    }
    
    return undefined;
  }

  private async processDiscoveredBusinesses() {
    console.log('🔍 Processing and verifying discovered businesses...');
    
    // Additional verification steps could include:
    // - Cross-referencing multiple sources
    // - Checking business registration numbers
    // - Verifying Indigenous ownership claims
    // - Validating contact information
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stopHunting() {
    this.isRunning = false;
    await this.webCrawler.cleanup();
    console.log('🛑 Business Hunter Swarm stopped');
  }

  getStatistics() {
    const businesses = Array.from(this.discoveredBusinesses.values());
    
    return {
      total: businesses.length,
      byType: {
        indigenous_owned: businesses.filter(b => b.type === 'indigenous_owned').length,
        bill_c5_ready: businesses.filter(b => b.type === 'bill_c5_ready').length,
        potential_partner: businesses.filter(b => b.type === 'potential_partner').length
      },
      byConfidence: {
        high: businesses.filter(b => b.confidence >= 80).length,
        medium: businesses.filter(b => b.confidence >= 60 && b.confidence < 80).length,
        low: businesses.filter(b => b.confidence < 60).length
      },
      byProvince: businesses.reduce((acc, b) => {
        if (b.location) {
          acc[b.location] = (acc[b.location] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    };
  }
}