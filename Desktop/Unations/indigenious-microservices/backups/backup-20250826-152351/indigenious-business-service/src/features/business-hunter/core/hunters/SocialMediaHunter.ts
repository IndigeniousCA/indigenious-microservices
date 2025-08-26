import { BaseHunter } from './BaseHunter';
import { DiscoveredBusiness } from '../../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram';
  author: {
    id: string;
    username: string;
    name: string;
    verified: boolean;
    followers: number;
  };
  content: string;
  hashtags: string[];
  mentions: string[];
  links: string[];
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: Date;
  location?: {
    city?: string;
    province?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export class SocialMediaHunter extends BaseHunter {
  private readonly platforms = ['twitter', 'facebook', 'linkedin', 'instagram'];
  private readonly indigenousKeywords = [
    'indigenous business', 'first nations enterprise', 'métis company',
    'inuit business', 'aboriginal owned', 'indigenous entrepreneur',
    'native owned business', 'indigenous supplier', 'first nations contractor',
    'indigenous construction', 'indigenous technology', 'indigenous consulting'
  ];
  
  private readonly industryPatterns = {
    construction: /construction|building|contractor|renovation|infrastructure/i,
    technology: /technology|software|IT|digital|tech|app|web development/i,
    consulting: /consulting|advisory|professional services|management/i,
    retail: /retail|store|shop|boutique|ecommerce|online store/i,
    manufacturing: /manufacturing|production|factory|assembly|fabrication/i,
    transportation: /transportation|logistics|trucking|delivery|freight/i,
    hospitality: /hospitality|hotel|restaurant|tourism|travel/i,
    healthcare: /healthcare|medical|health services|clinic|wellness/i,
    education: /education|training|school|academy|learning/i,
    energy: /energy|oil|gas|renewable|solar|wind|power/i
  };

  constructor() {
    super({
      name: 'SocialMediaHunter',
      type: 'social_media',
      config: {
        rateLimit: 30, // Lower rate limit for social media APIs
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 2000
      }
    });
  }

  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    const platform = source.toLowerCase();
    if (!this.platforms.includes(platform)) {
      throw new Error(`Unsupported social media platform: ${source}`);
    }

    try {
      const posts = await this.searchPlatform(platform, options);
      const businesses = await this.extractBusinessesFromPosts(posts);
      
      logger.info(`SocialMediaHunter found ${businesses.length} businesses on ${platform}`);
      return businesses;
    } catch (error) {
      logger.error(`SocialMediaHunter error on ${platform}:`, error);
      throw error;
    }
  }

  private async searchPlatform(platform: string, options?: any): Promise<SocialMediaPost[]> {
    // In production, this would use actual social media APIs
    // For now, we'll simulate the search
    await this.rateLimiter.check();

    const mockPosts: SocialMediaPost[] = [];
    const searchQuery = options?.query || this.indigenousKeywords.join(' OR ');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock social media posts
    for (let i = 0; i < 20; i++) {
      const keyword = this.indigenousKeywords[Math.floor(Math.random() * this.indigenousKeywords.length)];
      const industry = Object.keys(this.industryPatterns)[Math.floor(Math.random() * Object.keys(this.industryPatterns).length)];
      
      mockPosts.push({
        id: crypto.randomBytes(16).toString('hex'),
        platform: platform as any,
        author: {
          id: crypto.randomBytes(8).toString('hex'),
          username: `user_${Math.random().toString(36).substr(2, 9)}`,
          name: this.generateBusinessName(),
          verified: Math.random() > 0.7,
          followers: Math.floor(Math.random() * 50000)
        },
        content: this.generatePostContent(keyword, industry),
        hashtags: this.generateHashtags(keyword, industry),
        mentions: [],
        links: [`https://example-business-${i}.com`],
        engagement: {
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 100),
          shares: Math.floor(Math.random() * 50)
        },
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        location: this.generateLocation()
      });
    }

    return mockPosts;
  }

  private async extractBusinessesFromPosts(posts: SocialMediaPost[]): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const processedAuthors = new Set<string>();

    for (const post of posts) {
      // Skip if we've already processed this author
      if (processedAuthors.has(post.author.id)) {
        continue;
      }
      processedAuthors.add(post.author.id);

      // Check if the post indicates a business
      if (!this.isBusinessPost(post)) {
        continue;
      }

      const business = await this.createBusinessFromPost(post);
      if (business) {
        businesses.push(business);
      }
    }

    return businesses;
  }

  private isBusinessPost(post: SocialMediaPost): boolean {
    const businessIndicators = [
      /we offer|our services|our products/i,
      /contact us|get in touch|reach out/i,
      /serving|providing|specializing/i,
      /years of experience|established|founded/i,
      /certified|licensed|registered/i,
      /\b(inc|corp|ltd|llc|company|enterprise)\b/i
    ];

    return businessIndicators.some(pattern => pattern.test(post.content)) ||
           post.author.verified ||
           post.author.followers > 1000;
  }

  private async createBusinessFromPost(post: SocialMediaPost): Promise<DiscoveredBusiness | null> {
    const industry = this.detectIndustry(post.content);
    if (!industry) return null;

    const businessName = this.extractBusinessName(post);
    const contactInfo = this.extractContactInfo(post);

    return {
      id: crypto.randomBytes(16).toString('hex'),
      name: businessName,
      legalName: businessName,
      description: this.extractDescription(post),
      industry: [industry],
      indigenousIdentifiers: {
        selfIdentified: true,
        communityAffiliation: this.extractCommunityAffiliation(post),
        certifications: []
      },
      contact: {
        ...contactInfo,
        socialMedia: {
          [post.platform]: post.author.username
        }
      },
      location: post.location ? {
        address: '',
        city: post.location.city || '',
        province: post.location.province || '',
        postalCode: '',
        country: 'Canada',
        coordinates: post.location.coordinates
      } : undefined,
      metadata: {
        source: `social_media_${post.platform}`,
        sourceId: post.id,
        discoveredAt: new Date(),
        confidence: this.calculateConfidence(post),
        lastUpdated: post.timestamp,
        verificationStatus: 'pending',
        socialMetrics: {
          followers: post.author.followers,
          engagement: post.engagement,
          verified: post.author.verified
        }
      }
    };
  }

  private extractBusinessName(post: SocialMediaPost): string {
    // Try to extract from author name if it looks like a business
    if (post.author.name && /\b(inc|corp|ltd|llc|company|enterprise)\b/i.test(post.author.name)) {
      return post.author.name;
    }

    // Look for business name patterns in content
    const namePatterns = [
      /^([A-Z][A-Za-z\s&]+(?:Inc|Corp|Ltd|LLC|Company|Enterprise))/,
      /proud to announce ([A-Z][A-Za-z\s&]+)/i,
      /introducing ([A-Z][A-Za-z\s&]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = post.content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return post.author.name;
  }

  private extractDescription(post: SocialMediaPost): string {
    // Clean up the content to create a description
    let description = post.content
      .replace(/#\w+/g, '') // Remove hashtags
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/https?:\/\/\S+/g, '') // Remove URLs
      .trim();

    // Limit to 500 characters
    if (description.length > 500) {
      description = description.substring(0, 497) + '...';
    }

    return description;
  }

  private extractContactInfo(post: SocialMediaPost): any {
    const contact: any = {};

    // Extract email
    const emailMatch = post.content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      contact.email = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = post.content.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) {
      contact.phone = phoneMatch[0];
    }

    // Extract website from links
    if (post.links.length > 0) {
      contact.website = post.links[0];
    }

    return contact;
  }

  private extractCommunityAffiliation(post: SocialMediaPost): string | undefined {
    const communities = [
      'First Nations', 'Métis', 'Inuit', 'Mi\'kmaq', 'Cree', 'Ojibwe',
      'Mohawk', 'Blackfoot', 'Cherokee', 'Haida', 'Dene', 'Innu'
    ];

    for (const community of communities) {
      if (post.content.toLowerCase().includes(community.toLowerCase())) {
        return community;
      }
    }

    return undefined;
  }

  private detectIndustry(content: string): string | null {
    for (const [industry, pattern] of Object.entries(this.industryPatterns)) {
      if (pattern.test(content)) {
        return industry;
      }
    }
    return null;
  }

  private calculateConfidence(post: SocialMediaPost): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on various factors
    if (post.author.verified) confidence += 0.2;
    if (post.author.followers > 10000) confidence += 0.1;
    if (post.author.followers > 1000) confidence += 0.05;
    if (post.engagement.likes > 100) confidence += 0.05;
    if (post.links.length > 0) confidence += 0.1;
    if (post.location) confidence += 0.05;

    // Check for business indicators
    if (/\b(inc|corp|ltd|llc|company|enterprise)\b/i.test(post.author.name)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private generateBusinessName(): string {
    const prefixes = ['Northern', 'Spirit', 'Eagle', 'Wolf', 'Bear', 'Raven', 'Thunder'];
    const suffixes = ['Enterprises', 'Solutions', 'Services', 'Group', 'Consulting', 'Industries'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  private generatePostContent(keyword: string, industry: string): string {
    const templates = [
      `Proud to be a ${keyword} specializing in ${industry}. Contact us for quality services!`,
      `As a ${keyword}, we're committed to excellence in ${industry}. 🦅 #IndigenousBusiness`,
      `Celebrating 10 years as a leading ${keyword} in the ${industry} sector. Thank you to our community!`,
      `We're hiring! Join our ${keyword} team in ${industry}. Great opportunity for growth.`,
      `New partnership announcement! Our ${keyword} is expanding ${industry} services across Canada.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateHashtags(keyword: string, industry: string): string[] {
    const hashtags = [
      '#IndigenousBusiness',
      '#FirstNationsEnterprise',
      '#IndigenousEntrepreneur',
      `#${industry.charAt(0).toUpperCase() + industry.slice(1)}`,
      '#CanadianBusiness',
      '#IndigenousExcellence'
    ];
    
    return hashtags.slice(0, 3 + Math.floor(Math.random() * 3));
  }

  private generateLocation(): any {
    const locations = [
      { city: 'Winnipeg', province: 'MB' },
      { city: 'Toronto', province: 'ON' },
      { city: 'Vancouver', province: 'BC' },
      { city: 'Calgary', province: 'AB' },
      { city: 'Saskatoon', province: 'SK' },
      { city: 'Thunder Bay', province: 'ON' },
      { city: 'Yellowknife', province: 'NT' },
      { city: 'Whitehorse', province: 'YT' }
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }
}