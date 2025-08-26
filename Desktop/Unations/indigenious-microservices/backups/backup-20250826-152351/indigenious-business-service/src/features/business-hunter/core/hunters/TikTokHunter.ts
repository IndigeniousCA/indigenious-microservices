/**
 * TikTok Business Hunter
 * Discovers businesses through TikTok videos and profiles
 */

import { BaseHunter } from './BaseHunter';
import { Redis } from 'ioredis';
import * as cheerio from 'cheerio';
import {
  DiscoveredBusiness,
  HunterConfig,
  BusinessType,
  SourceType
} from '../../types';

export class TikTokHunter extends BaseHunter {
  private readonly apiKey?: string;
  private readonly hashtags = [
    'indigenousbusiness',
    'indigenousowned',
    'firstnationsbusiness',
    'metisbusiness',
    'inuitbusiness',
    'indigenousentrepreneur',
    'nativeowned',
    'shopindigenous',
    'indigenousmade',
    'canadianindigenous',
    'supportindigenous',
    'indigenouscanada'
  ];

  private readonly soundTrends = [
    'indigenous music',
    'pow wow',
    'native sounds',
    'first nations music'
  ];

  constructor(config: HunterConfig, redis: Redis) {
    super(config, redis);
    this.apiKey = process.env.TIKTOK_API_KEY;
  }

  /**
   * Hunt for businesses on TikTok
   */
  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const hashtag = options?.hashtag || this.hashtags[0];

    this.logger.info(`TikTok hunter starting with hashtag: #${hashtag}`, {
      source,
      hunterId: this.id
    });

    try {
      // Search by hashtags
      for (const tag of this.hashtags.slice(0, 5)) { // Limit to avoid rate limits
        const hashtagResults = await this.searchByHashtag(tag);
        businesses.push(...hashtagResults);
        await this.sleep(2000); // Rate limiting
      }

      // Search business accounts
      const businessAccounts = await this.searchBusinessAccounts();
      businesses.push(...businessAccounts);

      // Search by sounds/music
      const soundResults = await this.searchBySounds();
      businesses.push(...soundResults);

      // Search live commerce
      const liveResults = await this.searchLiveCommerce();
      businesses.push(...liveResults);

      this.logger.info(`TikTok hunter completed`, {
        discovered: businesses.length,
        hashtag
      });

    } catch (error) {
      this.logger.error('TikTok hunting failed:', error);
      this.stats.errors++;
    }

    return businesses;
  }

  /**
   * Search by hashtag
   */
  private async searchByHashtag(hashtag: string): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    try {
      if (this.apiKey) {
        // TikTok API endpoint
        const response = await this.httpClient.post(
          'https://open-api.tiktok.com/video/search/',
          {
            keyword: `#${hashtag}`,
            count: 50,
            cursor: 0
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data?.data?.videos) {
          for (const video of response.data.data.videos) {
            const videoBusiness = await this.extractBusinessFromVideo(video);
            if (videoBusiness) {
              businesses.push(videoBusiness);
            }
          }
        }
      } else {
        // Fallback to scraping
        const scrapedResults = await this.scrapeHashtag(hashtag);
        businesses.push(...scrapedResults);
      }

    } catch (error) {
      this.logger.error(`Hashtag search failed for #${hashtag}:`, error);
    }

    return businesses;
  }

  /**
   * Scrape hashtag page
   */
  private async scrapeHashtag(hashtag: string): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    try {
      const url = `https://www.tiktok.com/tag/${hashtag}`;
      const response = await this.httpClient.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // TikTok loads content dynamically, look for initial data
      const scriptTags = $('script#SIGI_STATE').html();
      if (scriptTags) {
        try {
          const data = JSON.parse(scriptTags);
          const videos = this.extractVideosFromData(data);
          
          for (const video of videos) {
            const business = this.parseVideoData(video);
            if (business) {
              businesses.push(business);
            }
          }
        } catch (error) {
          this.logger.debug('Failed to parse TikTok data:', error);
        }
      }

    } catch (error) {
      this.logger.error('TikTok scraping failed:', error);
    }

    return businesses;
  }

  /**
   * Search business accounts
   */
  private async searchBusinessAccounts(): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    // Known Indigenous business TikTok accounts
    const knownAccounts = [
      '@shopindigenous',
      '@indigenousbiz',
      '@nativebusiness',
      // Add more as discovered
    ];

    for (const username of knownAccounts) {
      try {
        const profile = await this.getProfile(username);
        if (profile && this.isBusinessProfile(profile)) {
          const business = this.parseBusinessProfile(profile);
          if (business) {
            businesses.push(business);
          }
        }
      } catch (error) {
        this.logger.debug(`Failed to get profile ${username}:`, error);
      }
    }

    return businesses;
  }

  /**
   * Search by sounds
   */
  private async searchBySounds(): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    // TikTok's algorithm promotes videos using trending sounds
    // Businesses often use these sounds to get discovered

    for (const soundQuery of this.soundTrends) {
      try {
        const videos = await this.searchVideosBySound(soundQuery);
        for (const video of videos) {
          const business = await this.extractBusinessFromVideo(video);
          if (business) {
            businesses.push(business);
          }
        }
      } catch (error) {
        this.logger.debug(`Sound search failed for ${soundQuery}:`, error);
      }
    }

    return businesses;
  }

  /**
   * Search TikTok Shop / Live Commerce
   */
  private async searchLiveCommerce(): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    // TikTok Shop is a growing channel for businesses
    try {
      if (this.apiKey) {
        // Would use TikTok Shop API
        const response = await this.httpClient.get(
          'https://open-api.tiktok.com/shop/search/',
          {
            params: {
              keyword: 'indigenous',
              category: 'all',
              access_token: this.apiKey
            }
          }
        );

        if (response.data?.sellers) {
          for (const seller of response.data.sellers) {
            const business = this.parseSellerProfile(seller);
            if (business) {
              businesses.push(business);
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug('Live commerce search failed:', error);
    }

    return businesses;
  }

  /**
   * Extract business from video
   */
  private async extractBusinessFromVideo(video: any): Promise<DiscoveredBusiness | null> {
    try {
      // Check if creator is a business
      const creator = video.author || video.creator;
      if (!creator) return null;

      if (this.isBusinessAccount(creator, video)) {
        const business: DiscoveredBusiness = {
          id: this.generateHash(`tiktok-${creator.id || creator.unique_id}`),
          name: this.cleanBusinessName(creator.nickname || creator.unique_id),
          description: video.desc || video.description,
          type: BusinessType.UNKNOWN,
          source: {
            type: SourceType.SOCIAL_MEDIA,
            name: 'TikTok',
            url: video.share_url || `https://www.tiktok.com/@${creator.unique_id}`,
            reliability: 0.6
          },
          discoveredAt: new Date(),
          confidence: 0.5,
          rawData: {
            username: creator.unique_id,
            followers: creator.follower_count,
            verified: creator.verified,
            videoId: video.id,
            views: video.statistics?.play_count,
            engagement: video.statistics?.share_count + video.statistics?.comment_count
          }
        };

        // Extract contact from bio
        const profile = await this.getProfile(`@${creator.unique_id}`);
        if (profile) {
          const contactInfo = this.extractContactInfo(profile.signature || profile.bio || '');
          if (contactInfo.email) business.email = contactInfo.email;
          if (contactInfo.phone) business.phone = contactInfo.phone;
          if (profile.link) business.website = this.cleanUrl(profile.link);
        }

        // Check if Indigenous-related
        if (this.isIndigenousRelated(video, creator)) {
          business.type = BusinessType.INDIGENOUS_AFFILIATED;
          business.confidence = 0.7;
        }

        return business;
      }

      // Check video content for business mentions
      const mentions = this.extractBusinessMentions(video);
      return mentions.length > 0 ? mentions[0] : null;

    } catch (error) {
      this.logger.debug('Failed to extract business from video:', error);
      return null;
    }
  }

  /**
   * Get TikTok profile
   */
  private async getProfile(username: string): Promise<any> {
    try {
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
      const url = `https://www.tiktok.com/@${cleanUsername}`;
      
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);

      // Extract profile data
      const scriptTag = $('#SIGI_STATE').html();
      if (scriptTag) {
        const data = JSON.parse(scriptTag);
        const userData = data.UserModule?.users?.[cleanUsername];
        
        if (userData) {
          return {
            id: userData.id,
            unique_id: userData.uniqueId,
            nickname: userData.nickname,
            signature: userData.signature,
            verified: userData.verified,
            follower_count: userData.stats?.followerCount,
            following_count: userData.stats?.followingCount,
            video_count: userData.stats?.videoCount,
            link: userData.bioLink?.link,
            commerce_user: userData.commerceUserInfo?.commerceUser,
            category: userData.commerceUserInfo?.category
          };
        }
      }

      return null;

    } catch (error) {
      this.logger.debug(`Failed to get profile ${username}:`, error);
      return null;
    }
  }

  /**
   * Check if account is a business
   */
  private isBusinessAccount(creator: any, video?: any): boolean {
    // TikTok business indicators
    if (creator.commerce_user) return true;
    if (creator.is_business) return true;
    if (creator.category?.includes('Business')) return true;

    const businessIndicators = [
      'shop', 'store', 'boutique', 'business', 'company',
      'handmade', 'custom', 'order', 'shipping', 'available',
      'dm for', 'link in bio', 'website', '.com', 'services'
    ];

    const checkText = [
      creator.nickname,
      creator.signature,
      video?.desc
    ].filter(Boolean).join(' ').toLowerCase();

    return businessIndicators.some(indicator => checkText.includes(indicator));
  }

  /**
   * Check if profile is a business
   */
  private isBusinessProfile(profile: any): boolean {
    return this.isBusinessAccount(profile);
  }

  /**
   * Parse business profile
   */
  private parseBusinessProfile(profile: any): DiscoveredBusiness | null {
    try {
      const business: DiscoveredBusiness = {
        id: this.generateHash(`tiktok-profile-${profile.id || profile.unique_id}`),
        name: this.cleanBusinessName(profile.nickname || profile.unique_id),
        description: profile.signature,
        website: this.cleanUrl(profile.link),
        type: BusinessType.UNKNOWN,
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'TikTok Profile',
          url: `https://www.tiktok.com/@${profile.unique_id}`,
          reliability: 0.7
        },
        discoveredAt: new Date(),
        confidence: 0.6,
        rawData: {
          username: profile.unique_id,
          followers: profile.follower_count,
          verified: profile.verified,
          category: profile.category,
          commerceUser: profile.commerce_user
        }
      };

      // Extract contact info
      const contactInfo = this.extractContactInfo(profile.signature || '');
      if (contactInfo.email) business.email = contactInfo.email;
      if (contactInfo.phone) business.phone = contactInfo.phone;

      // Boost confidence for verified or commerce accounts
      if (profile.verified || profile.commerce_user) {
        business.confidence = 0.8;
      }

      return business;

    } catch (error) {
      this.logger.error('Failed to parse business profile:', error);
      return null;
    }
  }

  /**
   * Parse seller profile (TikTok Shop)
   */
  private parseSellerProfile(seller: any): DiscoveredBusiness | null {
    try {
      const business: DiscoveredBusiness = {
        id: this.generateHash(`tiktok-shop-${seller.seller_id}`),
        name: this.cleanBusinessName(seller.shop_name || seller.seller_name),
        description: seller.shop_description,
        type: BusinessType.UNKNOWN,
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'TikTok Shop',
          url: seller.shop_url,
          reliability: 0.85
        },
        discoveredAt: new Date(),
        confidence: 0.8,
        rawData: {
          sellerId: seller.seller_id,
          rating: seller.rating,
          productCount: seller.product_count,
          category: seller.category,
          verified: seller.is_verified
        }
      };

      // Shop location
      if (seller.location) {
        business.address = {
          city: seller.location.city,
          province: this.mapToProvince(seller.location.province),
          country: 'Canada'
        };
      }

      // Contact info from shop
      if (seller.contact_email) business.email = seller.contact_email;
      if (seller.contact_phone) business.phone = seller.contact_phone;

      return business;

    } catch (error) {
      this.logger.error('Failed to parse seller profile:', error);
      return null;
    }
  }

  /**
   * Extract videos from scraped data
   */
  private extractVideosFromData(data: any): any[] {
    try {
      const videos = [];
      
      // Navigate through TikTok's data structure
      if (data.ItemModule) {
        for (const key in data.ItemModule) {
          if (data.ItemModule[key]?.video) {
            videos.push(data.ItemModule[key]);
          }
        }
      }

      return videos;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse video data from scraping
   */
  private parseVideoData(video: any): DiscoveredBusiness | null {
    try {
      if (!video.author) return null;

      const business: DiscoveredBusiness = {
        id: this.generateHash(`tiktok-video-${video.id}`),
        name: video.author.nickname || video.author.uniqueId,
        description: video.desc,
        type: BusinessType.UNKNOWN,
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'TikTok Video',
          url: `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`,
          reliability: 0.5
        },
        discoveredAt: new Date(),
        confidence: 0.4,
        rawData: {
          videoId: video.id,
          author: video.author.uniqueId,
          stats: video.stats
        }
      };

      if (this.isBusinessAccount(video.author, video)) {
        business.confidence = 0.6;
        
        if (this.isIndigenousRelated(video, video.author)) {
          business.type = BusinessType.INDIGENOUS_AFFILIATED;
          business.confidence = 0.7;
        }
      }

      return business;

    } catch (error) {
      this.logger.debug('Failed to parse video data:', error);
      return null;
    }
  }

  /**
   * Search videos by sound
   */
  private async searchVideosBySound(soundQuery: string): Promise<any[]> {
    // Would search for videos using specific sounds
    // Limited without API access
    return [];
  }

  /**
   * Extract business mentions from video
   */
  private extractBusinessMentions(video: any): DiscoveredBusiness[] {
    const businesses: DiscoveredBusiness[] = [];
    const description = video.desc || video.description || '';

    // Look for @mentions
    const mentionPattern = /@([a-zA-Z0-9._]+)/g;
    const matches = description.matchAll(mentionPattern);

    for (const match of matches) {
      const username = match[1];
      if (this.isLikelyBusinessUsername(username)) {
        businesses.push({
          id: this.generateHash(`tiktok-mention-${username}`),
          name: username,
          type: BusinessType.UNKNOWN,
          source: {
            type: SourceType.SOCIAL_MEDIA,
            name: 'TikTok Mention',
            reliability: 0.3
          },
          discoveredAt: new Date(),
          confidence: 0.3,
          rawData: {
            username,
            fromVideo: video.id
          }
        });
      }
    }

    return businesses;
  }

  /**
   * Check if content is Indigenous-related
   */
  private isIndigenousRelated(video: any, creator: any): boolean {
    const searchText = [
      video.desc,
      video.description,
      creator.nickname,
      creator.signature,
      video.challenges?.map((c: any) => c.title).join(' ')
    ].filter(Boolean).join(' ').toLowerCase();

    const indigenousKeywords = [
      'indigenous', 'firstnations', 'métis', 'metis', 'inuit',
      'aboriginal', 'native', 'nativeowned', 'indigenousowned',
      'indigenousbusiness', 'shopindigenous', 'nativebusiness',
      'firstnationsbusiness', 'powwow', 'treaty'
    ];

    return indigenousKeywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Check if username is likely a business
   */
  private isLikelyBusinessUsername(username: string): boolean {
    const businessSuffixes = [
      'shop', 'store', 'boutique', 'co', 'studio',
      'supply', 'services', 'official', 'biz'
    ];

    const lower = username.toLowerCase();
    return businessSuffixes.some(suffix => lower.includes(suffix));
  }

  /**
   * Extract contact info from text
   */
  private extractContactInfo(text: string): { email?: string; phone?: string } {
    const contact: { email?: string; phone?: string } = {};

    // Email - often written with [at] or (at) to avoid spam
    let emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (!emailMatch) {
      // Try alternative formats
      emailMatch = text.match(/[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
      if (emailMatch) {
        contact.email = emailMatch[0].replace(/\s*\[at\]\s*/i, '@');
      }
    } else {
      contact.email = this.cleanEmail(emailMatch[0]);
    }

    // Phone
    const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
    if (phoneMatch) {
      contact.phone = this.cleanPhone(phoneMatch[0]);
    }

    return contact;
  }

  /**
   * Map location to province
   */
  private mapToProvince(location?: string): string | undefined {
    if (!location) return undefined;

    const provinceMap: Record<string, string> = {
      'ontario': 'ON', 'quebec': 'QC', 'british columbia': 'BC',
      'alberta': 'AB', 'manitoba': 'MB', 'saskatchewan': 'SK',
      'nova scotia': 'NS', 'new brunswick': 'NB', 'newfoundland': 'NL',
      'prince edward island': 'PE', 'northwest territories': 'NT',
      'yukon': 'YT', 'nunavut': 'NU'
    };

    const lower = location.toLowerCase();
    for (const [name, code] of Object.entries(provinceMap)) {
      if (lower.includes(name)) return code;
    }

    return undefined;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate hash
   */
  private generateHash(input: string): string {
    return require('crypto').createHash('md5').update(input).digest('hex');
  }
}