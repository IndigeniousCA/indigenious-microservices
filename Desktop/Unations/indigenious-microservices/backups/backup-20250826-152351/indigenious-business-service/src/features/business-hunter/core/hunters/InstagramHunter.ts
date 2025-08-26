/**
 * Instagram Business Hunter
 * Discovers businesses through Instagram posts and profiles
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

export class InstagramHunter extends BaseHunter {
  private readonly apiKey?: string;
  private readonly hashtags = [
    'indigenousbusiness',
    'indigenousowned',
    'firstnationsbusiness',
    'metisbusiness',
    'inuitbusiness',
    'buyindigenous',
    'supportindigenous',
    'indigenousentrepreneur',
    'indigenousmade',
    'nativebusiness',
    'indigenouscanada',
    'shopindigenous'
  ];

  constructor(config: HunterConfig, redis: Redis) {
    super(config, redis);
    this.apiKey = process.env.INSTAGRAM_API_KEY;
  }

  /**
   * Hunt for businesses on Instagram
   */
  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const hashtag = options?.hashtag || this.hashtags[0];

    this.logger.info(`Instagram hunter starting with hashtag: #${hashtag}`, {
      source,
      hunterId: this.id
    });

    try {
      // Search by hashtags
      const hashtagResults = await this.searchByHashtag(hashtag);
      businesses.push(...hashtagResults);

      // Search business profiles
      const profileResults = await this.searchBusinessProfiles();
      businesses.push(...profileResults);

      // Search location-based
      const locationResults = await this.searchByLocation();
      businesses.push(...locationResults);

      // Search mentions and tags
      const mentionResults = await this.searchMentions();
      businesses.push(...mentionResults);

      this.logger.info(`Instagram hunter completed`, {
        discovered: businesses.length,
        hashtag
      });

    } catch (error) {
      this.logger.error('Instagram hunting failed:', error);
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
      // Instagram Graph API endpoint
      if (this.apiKey) {
        const response = await this.httpClient.get(
          `https://graph.instagram.com/v12.0/ig_hashtag_search`,
          {
            params: {
              user_id: process.env.INSTAGRAM_USER_ID,
              q: hashtag,
              access_token: this.apiKey
            }
          }
        );

        if (response.data?.data?.[0]?.id) {
          const hashtagId = response.data.data[0].id;
          
          // Get recent media for hashtag
          const mediaResponse = await this.httpClient.get(
            `https://graph.instagram.com/v12.0/${hashtagId}/recent_media`,
            {
              params: {
                user_id: process.env.INSTAGRAM_USER_ID,
                fields: 'id,caption,media_type,media_url,permalink,username',
                access_token: this.apiKey
              }
            }
          );

          if (mediaResponse.data?.data) {
            for (const post of mediaResponse.data.data) {
              const postBusinesses = await this.extractBusinessFromPost(post);
              businesses.push(...postBusinesses);
            }
          }
        }
      } else {
        // Fallback to web scraping
        const scrapedResults = await this.scrapeHashtag(hashtag);
        businesses.push(...scrapedResults);
      }

    } catch (error) {
      this.logger.error(`Hashtag search failed for #${hashtag}:`, error);
    }

    return businesses;
  }

  /**
   * Scrape hashtag page (fallback)
   */
  private async scrapeHashtag(hashtag: string): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    try {
      const url = `https://www.instagram.com/explore/tags/${hashtag}/`;
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);

      // Extract data from script tags
      $('script[type="text/javascript"]').each((i, elem) => {
        const scriptContent = $(elem).html() || '';
        if (scriptContent.includes('window._sharedData')) {
          try {
            const dataMatch = scriptContent.match(/window\._sharedData\s*=\s*({.+});/);
            if (dataMatch) {
              const sharedData = JSON.parse(dataMatch[1]);
              const posts = this.extractPostsFromSharedData(sharedData);
              
              for (const post of posts) {
                const postBusinesses = this.parseScrapedPost(post);
                businesses.push(...postBusinesses);
              }
            }
          } catch (error) {
            this.logger.debug('Failed to parse shared data:', error);
          }
        }
      });

    } catch (error) {
      this.logger.error('Instagram scraping failed:', error);
    }

    return businesses;
  }

  /**
   * Search business profiles
   */
  private async searchBusinessProfiles(): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    // Known Indigenous business accounts
    const knownAccounts = [
      'shopindigenous',
      'indigenousbusinessdirectory',
      'ccab_national',
      // Add more known accounts
    ];

    for (const username of knownAccounts) {
      try {
        const profile = await this.getProfile(username);
        if (profile) {
          // Check if it's a business profile
          if (profile.is_business_account || this.isBusinessProfile(profile)) {
            const business = this.parseBusinessProfile(profile);
            if (business) {
              businesses.push(business);
            }
          }

          // Get followers/following that might be businesses
          const relatedAccounts = await this.getRelatedAccounts(username);
          for (const account of relatedAccounts) {
            if (this.isBusinessProfile(account)) {
              const business = this.parseBusinessProfile(account);
              if (business) {
                businesses.push(business);
              }
            }
          }
        }
      } catch (error) {
        this.logger.debug(`Failed to get profile ${username}:`, error);
      }
    }

    return businesses;
  }

  /**
   * Search by location
   */
  private async searchByLocation(): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    const locations = [
      { name: 'Toronto, Ontario', id: '6889842' },
      { name: 'Vancouver, British Columbia', id: '294265' },
      { name: 'Montreal, Quebec', id: '6264248' },
      { name: 'Calgary, Alberta', id: '5913490' },
      // Add more Canadian cities
    ];

    for (const location of locations) {
      try {
        const locationPosts = await this.searchLocation(location.id);
        for (const post of locationPosts) {
          const postBusinesses = await this.extractBusinessFromPost(post);
          businesses.push(...postBusinesses);
        }
      } catch (error) {
        this.logger.debug(`Location search failed for ${location.name}:`, error);
      }
    }

    return businesses;
  }

  /**
   * Search mentions and tags
   */
  private async searchMentions(): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    // This would require monitoring mentions of known accounts
    // or searching for specific mention patterns

    return businesses;
  }

  /**
   * Extract business from post
   */
  private async extractBusinessFromPost(post: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    try {
      // Get user profile
      const userProfile = await this.getProfile(post.username);
      
      if (userProfile && this.isBusinessProfile(userProfile)) {
        const business = this.parseBusinessProfile(userProfile);
        if (business) {
          // Add post context
          business.rawData.discoveryPost = {
            id: post.id,
            caption: post.caption,
            permalink: post.permalink
          };
          businesses.push(business);
        }
      }

      // Extract mentioned businesses from caption
      if (post.caption) {
        const mentionedBusinesses = this.extractMentions(post.caption);
        businesses.push(...mentionedBusinesses);
      }

    } catch (error) {
      this.logger.debug('Failed to extract business from post:', error);
    }

    return businesses;
  }

  /**
   * Get Instagram profile
   */
  private async getProfile(username: string): Promise<any> {
    try {
      if (this.apiKey) {
        // Use Instagram Basic Display API
        const response = await this.httpClient.get(
          `https://graph.instagram.com/v12.0/${username}`,
          {
            params: {
              fields: 'id,username,account_type,media_count,followers_count,biography,website',
              access_token: this.apiKey
            }
          }
        );
        return response.data;
      } else {
        // Scrape profile page
        return await this.scrapeProfile(username);
      }
    } catch (error) {
      this.logger.debug(`Failed to get profile ${username}:`, error);
      return null;
    }
  }

  /**
   * Scrape profile (fallback)
   */
  private async scrapeProfile(username: string): Promise<any> {
    try {
      const url = `https://www.instagram.com/${username}/`;
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);

      // Extract profile data from meta tags
      const profile: any = {
        username,
        name: $('meta[property="og:title"]').attr('content'),
        biography: $('meta[property="og:description"]').attr('content'),
        profile_pic_url: $('meta[property="og:image"]').attr('content')
      };

      // Extract additional data from script tags
      $('script[type="text/javascript"]').each((i, elem) => {
        const scriptContent = $(elem).html() || '';
        if (scriptContent.includes('window._sharedData')) {
          try {
            const dataMatch = scriptContent.match(/window\._sharedData\s*=\s*({.+});/);
            if (dataMatch) {
              const sharedData = JSON.parse(dataMatch[1]);
              const user = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
              if (user) {
                Object.assign(profile, {
                  id: user.id,
                  full_name: user.full_name,
                  biography: user.biography,
                  external_url: user.external_url,
                  followers_count: user.edge_followed_by?.count,
                  is_business_account: user.is_business_account,
                  business_category_name: user.business_category_name,
                  business_email: user.business_email,
                  business_phone_number: user.business_phone_number,
                  business_address_json: user.business_address_json
                });
              }
            }
          } catch (error) {
            this.logger.debug('Failed to parse profile data:', error);
          }
        }
      });

      return profile;

    } catch (error) {
      this.logger.debug(`Failed to scrape profile ${username}:`, error);
      return null;
    }
  }

  /**
   * Check if profile is a business
   */
  private isBusinessProfile(profile: any): boolean {
    if (profile.is_business_account) return true;
    if (profile.account_type === 'BUSINESS') return true;

    const businessIndicators = [
      'business', 'company', 'corp', 'inc', 'ltd', 'llc',
      'services', 'shop', 'store', 'boutique', 'studio',
      'supplier', 'contractor', 'consulting', 'agency'
    ];

    const profileText = [
      profile.username,
      profile.name || profile.full_name,
      profile.biography,
      profile.business_category_name
    ].join(' ').toLowerCase();

    return businessIndicators.some(indicator => profileText.includes(indicator));
  }

  /**
   * Parse business profile
   */
  private parseBusinessProfile(profile: any): DiscoveredBusiness | null {
    try {
      const business: DiscoveredBusiness = {
        id: this.generateHash(`instagram-${profile.id || profile.username}`),
        name: this.cleanBusinessName(profile.name || profile.full_name || profile.username),
        description: profile.biography,
        website: this.cleanUrl(profile.external_url || profile.website),
        email: profile.business_email,
        phone: this.cleanPhone(profile.business_phone_number),
        type: BusinessType.UNKNOWN,
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'Instagram',
          url: `https://www.instagram.com/${profile.username}/`,
          reliability: 0.7
        },
        discoveredAt: new Date(),
        confidence: 0.65,
        rawData: {
          username: profile.username,
          followers: profile.followers_count || profile.edge_followed_by?.count,
          category: profile.business_category_name,
          mediaCount: profile.media_count
        }
      };

      // Parse business address
      if (profile.business_address_json) {
        try {
          const address = typeof profile.business_address_json === 'string' 
            ? JSON.parse(profile.business_address_json)
            : profile.business_address_json;
          
          if (address.city_name || address.street_address) {
            business.address = {
              street: address.street_address,
              city: address.city_name,
              province: this.mapToProvince(address.region_name),
              postalCode: address.zip_code,
              country: 'Canada'
            };
          }
        } catch (error) {
          this.logger.debug('Failed to parse business address:', error);
        }
      }

      // Extract contact from bio
      if (!business.email || !business.phone) {
        const contactInfo = this.extractContactInfo(profile.biography || '');
        if (!business.email && contactInfo.email) business.email = contactInfo.email;
        if (!business.phone && contactInfo.phone) business.phone = contactInfo.phone;
      }

      // Check if Indigenous-related
      if (this.isIndigenousRelated(profile)) {
        business.type = BusinessType.INDIGENOUS_AFFILIATED;
        business.confidence = 0.8;
      }

      return business;

    } catch (error) {
      this.logger.error('Failed to parse business profile:', error);
      return null;
    }
  }

  /**
   * Extract posts from shared data
   */
  private extractPostsFromSharedData(sharedData: any): any[] {
    try {
      const posts = [];
      const edges = sharedData?.entry_data?.TagPage?.[0]?.graphql?.hashtag?.edge_hashtag_to_media?.edges || [];
      
      for (const edge of edges) {
        posts.push(edge.node);
      }
      
      return posts;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse scraped post
   */
  private parseScrapedPost(post: any): DiscoveredBusiness[] {
    const businesses: DiscoveredBusiness[] = [];

    try {
      // Check if post owner is a business
      if (post.owner && this.isLikelyBusiness(post.owner.username)) {
        const business: DiscoveredBusiness = {
          id: this.generateHash(`instagram-${post.owner.id}`),
          name: post.owner.full_name || post.owner.username,
          type: BusinessType.UNKNOWN,
          source: {
            type: SourceType.SOCIAL_MEDIA,
            name: 'Instagram Post',
            url: `https://www.instagram.com/p/${post.shortcode}/`,
            reliability: 0.5
          },
          discoveredAt: new Date(),
          confidence: 0.5,
          rawData: {
            username: post.owner.username,
            postId: post.id,
            caption: post.edge_media_to_caption?.edges?.[0]?.node?.text
          }
        };

        if (this.isIndigenousRelated(post)) {
          business.type = BusinessType.INDIGENOUS_AFFILIATED;
          business.confidence = 0.65;
        }

        businesses.push(business);
      }

      // Extract mentions from caption
      const caption = post.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      const mentions = this.extractMentions(caption);
      businesses.push(...mentions);

    } catch (error) {
      this.logger.debug('Failed to parse scraped post:', error);
    }

    return businesses;
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): DiscoveredBusiness[] {
    const businesses: DiscoveredBusiness[] = [];
    const mentionPattern = /@([a-zA-Z0-9._]+)/g;
    const matches = text.matchAll(mentionPattern);

    for (const match of matches) {
      const username = match[1];
      if (this.isLikelyBusiness(username)) {
        const business: DiscoveredBusiness = {
          id: this.generateHash(`instagram-mention-${username}`),
          name: username,
          type: BusinessType.UNKNOWN,
          source: {
            type: SourceType.SOCIAL_MEDIA,
            name: 'Instagram Mention',
            reliability: 0.4
          },
          discoveredAt: new Date(),
          confidence: 0.3,
          rawData: {
            username,
            mentionContext: text.substring(Math.max(0, match.index! - 50), match.index! + 50)
          }
        };

        if (this.isIndigenousRelated(text)) {
          business.type = BusinessType.INDIGENOUS_AFFILIATED;
          business.confidence = 0.5;
        }

        businesses.push(business);
      }
    }

    return businesses;
  }

  /**
   * Get related accounts
   */
  private async getRelatedAccounts(username: string): Promise<any[]> {
    // This would fetch followers/following
    // Limited without proper API access
    return [];
  }

  /**
   * Search by location ID
   */
  private async searchLocation(locationId: string): Promise<any[]> {
    // This would search posts by location
    return [];
  }

  /**
   * Check if username is likely a business
   */
  private isLikelyBusiness(username: string): boolean {
    const businessPatterns = [
      /(?:shop|store|boutique|studio|co|company|biz|business)/i,
      /(?:supply|supplies|services|solutions|consulting)/i,
      /(?:inc|corp|ltd|llc)$/i,
      /official$/i
    ];

    return businessPatterns.some(pattern => pattern.test(username));
  }

  /**
   * Check if content is Indigenous-related
   */
  private isIndigenousRelated(content: any): boolean {
    const searchText = JSON.stringify(content).toLowerCase();
    
    const indigenousKeywords = [
      'indigenous', 'first nations', 'métis', 'metis', 'inuit',
      'aboriginal', 'native', 'firstnations', 'indigenousowned',
      'buyindigenous', 'indigenousmade', 'nativebusiness'
    ];

    return indigenousKeywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Extract contact info
   */
  private extractContactInfo(text: string): { email?: string; phone?: string } {
    const contact: { email?: string; phone?: string } = {};

    // Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
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
   * Generate hash
   */
  private generateHash(input: string): string {
    return require('crypto').createHash('md5').update(input).digest('hex');
  }
}