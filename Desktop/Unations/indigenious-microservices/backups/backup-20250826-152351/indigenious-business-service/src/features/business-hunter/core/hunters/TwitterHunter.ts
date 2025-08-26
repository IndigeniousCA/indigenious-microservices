/**
 * Twitter/X Business Hunter
 * Discovers businesses through Twitter/X posts and profiles
 */

import { BaseHunter } from './BaseHunter';
import { Redis } from 'ioredis';
import { TwitterApi } from 'twitter-api-v2';
import {
  DiscoveredBusiness,
  HunterConfig,
  BusinessType,
  SourceType
} from '../../types';

export class TwitterHunter extends BaseHunter {
  private twitterClient?: TwitterApi;
  private readonly searchTerms = [
    '#IndigenousBusiness',
    '#FirstNationsBusiness',
    '#MetisBusiness',
    '#InuitBusiness',
    '#IndigenousEntrepreneur',
    '#IndigenousOwned',
    '#Buy4TheCommunity',
    '#BuyIndigenous',
    '#IndigenousSupplier',
    '#IndigenousContractor',
    'Indigenous business Canada',
    'First Nations owned',
    'Métis entrepreneur',
    'Inuit company'
  ];

  constructor(config: HunterConfig, redis: Redis) {
    super(config, redis);
    
    // Initialize Twitter client if credentials available
    if (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET) {
      this.twitterClient = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET
      });
    }
  }

  /**
   * Hunt for businesses on Twitter
   */
  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const searchTerm = options?.query || this.searchTerms[0];

    this.logger.info(`Twitter hunter starting with term: ${searchTerm}`, {
      source,
      hunterId: this.id
    });

    try {
      if (this.twitterClient) {
        // Use Twitter API
        const apiResults = await this.searchViaAPI(searchTerm, options);
        businesses.push(...apiResults);
      } else {
        // Fallback to web scraping
        this.logger.warn('Twitter API not configured, using limited scraping');
        const scrapedResults = await this.searchViaScraping(searchTerm, options);
        businesses.push(...scrapedResults);
      }

      // Search user profiles
      const profileResults = await this.searchProfiles(searchTerm);
      businesses.push(...profileResults);

      // Search lists and communities
      const listResults = await this.searchLists();
      businesses.push(...listResults);

      this.logger.info(`Twitter hunter completed`, {
        discovered: businesses.length,
        searchTerm
      });

    } catch (error) {
      this.logger.error('Twitter hunting failed:', error);
      this.stats.errors++;
    }

    return businesses;
  }

  /**
   * Search via Twitter API v2
   */
  private async searchViaAPI(query: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    try {
      const client = this.twitterClient!.v2;
      
      // Search tweets
      const tweets = await client.search(query, {
        'tweet.fields': ['author_id', 'created_at', 'entities', 'geo'],
        'user.fields': ['name', 'username', 'description', 'location', 'url', 'verified'],
        'expansions': ['author_id'],
        'max_results': 100
      });

      for await (const tweet of tweets) {
        const author = tweets.includes?.users?.find(u => u.id === tweet.author_id);
        
        // Extract business info from tweet
        const tweetBusinesses = this.extractBusinessesFromTweet(tweet, author);
        businesses.push(...tweetBusinesses);

        // Check if author is a business
        if (author && this.isBusinessProfile(author)) {
          const business = this.parseBusinessProfile(author);
          if (business) {
            businesses.push(business);
          }
        }
      }

    } catch (error) {
      this.logger.error('Twitter API search failed:', error);
    }

    return businesses;
  }

  /**
   * Limited web scraping fallback
   */
  private async searchViaScraping(query: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    
    // Twitter has strong anti-scraping measures
    // This would need advanced techniques like browser automation
    this.logger.warn('Twitter scraping is limited due to anti-bot measures');
    
    return businesses;
  }

  /**
   * Search user profiles
   */
  private async searchProfiles(query: string): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    if (!this.twitterClient) return businesses;

    try {
      const client = this.twitterClient.v2;
      
      // Search for users
      const users = await client.userSearch(query, {
        'user.fields': ['name', 'username', 'description', 'location', 'url', 'verified', 'public_metrics']
      });

      for (const user of users.data || []) {
        if (this.isBusinessProfile(user)) {
          const business = this.parseBusinessProfile(user);
          if (business && this.isRelevantBusiness(business)) {
            businesses.push(business);
          }
        }
      }

      // Search specific Indigenous business accounts
      const knownAccounts = [
        'CCAB_NATIONAL',
        'NACCA_ANRDA',
        'AFN_Updates',
        'ITK_CanadaInuit',
        'MNC_tweets'
      ];

      for (const username of knownAccounts) {
        try {
          const user = await client.userByUsername(username);
          if (user.data) {
            // Get their followers who might be businesses
            const followers = await client.followers(user.data.id, {
              max_results: 100,
              'user.fields': ['name', 'username', 'description', 'location', 'url']
            });

            for (const follower of followers.data || []) {
              if (this.isBusinessProfile(follower)) {
                const business = this.parseBusinessProfile(follower);
                if (business) {
                  businesses.push(business);
                }
              }
            }
          }
        } catch (error) {
          this.logger.debug(`Failed to get followers for ${username}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Profile search failed:', error);
    }

    return businesses;
  }

  /**
   * Search Twitter lists
   */
  private async searchLists(): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    if (!this.twitterClient) return businesses;

    try {
      const client = this.twitterClient.v2;
      
      // Known Indigenous business lists
      const listIds = [
        // These would be actual list IDs
      ];

      for (const listId of listIds) {
        try {
          const members = await client.listMembers(listId, {
            'user.fields': ['name', 'username', 'description', 'location', 'url'],
            max_results: 100
          });

          for (const member of members.data || []) {
            if (this.isBusinessProfile(member)) {
              const business = this.parseBusinessProfile(member);
              if (business) {
                businesses.push(business);
              }
            }
          }
        } catch (error) {
          this.logger.debug(`Failed to get list members for ${listId}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('List search failed:', error);
    }

    return businesses;
  }

  /**
   * Extract businesses from tweet content
   */
  private extractBusinessesFromTweet(tweet: any, author: any): DiscoveredBusiness[] {
    const businesses: DiscoveredBusiness[] = [];
    const text = tweet.text;

    // Look for business mentions
    const businessPatterns = [
      /@(\w+)/g, // Mentions
      /(?:our company|we at|proud to announce|launching|now open)\s+([A-Z][A-Za-z0-9\s&\-\.]+)/gi,
      /([A-Z][A-Za-z0-9\s&\-\.]+)\s+(?:Inc|Corp|Ltd|Limited|LLC|LLP)/gi
    ];

    // Extract URLs
    const urls = tweet.entities?.urls || [];
    
    for (const url of urls) {
      if (url.expanded_url && !url.expanded_url.includes('twitter.com')) {
        // Potential business website
        const business: DiscoveredBusiness = {
          id: this.generateHash(`twitter-url-${url.expanded_url}`),
          name: url.display_url?.replace(/^www\./, '').split('.')[0] || 'Unknown',
          website: url.expanded_url,
          description: `Mentioned by @${author?.username}: ${text.substring(0, 100)}...`,
          type: BusinessType.UNKNOWN,
          source: {
            type: SourceType.SOCIAL_MEDIA,
            name: 'Twitter',
            url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
            reliability: 0.5
          },
          discoveredAt: new Date(),
          confidence: 0.4,
          rawData: {
            tweetId: tweet.id,
            authorUsername: author?.username,
            authorName: author?.name
          }
        };

        if (this.isIndigenousRelated(text)) {
          business.type = BusinessType.INDIGENOUS_AFFILIATED;
          business.confidence = 0.6;
        }

        businesses.push(business);
      }
    }

    // Extract mentioned usernames
    const mentions = tweet.entities?.mentions || [];
    for (const mention of mentions) {
      // We'll check these profiles later
      this.logger.debug(`Found mention: @${mention.username}`);
    }

    return businesses;
  }

  /**
   * Check if Twitter profile is a business
   */
  private isBusinessProfile(user: any): boolean {
    const businessIndicators = [
      'business', 'company', 'corp', 'inc', 'ltd', 'llc',
      'services', 'solutions', 'consulting', 'agency',
      'studio', 'shop', 'store', 'supplier', 'contractor',
      'enterprise', 'ventures', 'partners', 'group'
    ];

    const profileText = [
      user.name,
      user.username,
      user.description
    ].join(' ').toLowerCase();

    // Check for business indicators
    const hasBusinessIndicator = businessIndicators.some(indicator => 
      profileText.includes(indicator)
    );

    // Check for website (most businesses have one)
    const hasWebsite = !!user.url;

    // Check description patterns
    const hasBusinessPattern = /(?:we |our |providing |offering |specializing |serving )/.test(user.description || '');

    return hasBusinessIndicator || (hasWebsite && hasBusinessPattern);
  }

  /**
   * Parse business profile
   */
  private parseBusinessProfile(user: any): DiscoveredBusiness | null {
    try {
      const business: DiscoveredBusiness = {
        id: this.generateHash(`twitter-user-${user.id}`),
        name: this.cleanBusinessName(user.name),
        description: user.description,
        website: this.extractWebsite(user),
        type: BusinessType.UNKNOWN,
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'Twitter Profile',
          url: `https://twitter.com/${user.username}`,
          reliability: 0.7
        },
        discoveredAt: new Date(),
        confidence: 0.6,
        rawData: {
          username: user.username,
          verified: user.verified,
          followers: user.public_metrics?.followers_count,
          location: user.location
        }
      };

      // Parse location
      if (user.location) {
        const location = this.parseLocation(user.location);
        if (location) {
          business.address = location;
        }
      }

      // Extract contact info from description
      const contactInfo = this.extractContactInfo(user.description);
      if (contactInfo.email) business.email = contactInfo.email;
      if (contactInfo.phone) business.phone = contactInfo.phone;

      // Check if Indigenous-related
      if (this.isIndigenousRelated(user.description || '')) {
        business.type = BusinessType.INDIGENOUS_AFFILIATED;
        business.confidence = 0.75;
      }

      // Boost confidence for verified accounts
      if (user.verified) {
        business.confidence = Math.min(business.confidence * 1.2, 0.95);
      }

      return business;

    } catch (error) {
      this.logger.error('Failed to parse business profile:', error);
      return null;
    }
  }

  /**
   * Extract website from user data
   */
  private extractWebsite(user: any): string | undefined {
    if (user.entities?.url?.urls?.[0]?.expanded_url) {
      return this.cleanUrl(user.entities.url.urls[0].expanded_url);
    }
    if (user.url) {
      return this.cleanUrl(user.url);
    }
    return undefined;
  }

  /**
   * Parse location string
   */
  private parseLocation(locationStr: string): any {
    const canadianCities = [
      'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton',
      'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Halifax',
      'London', 'Victoria', 'Saskatoon', 'Regina', 'St. John\'s'
    ];

    const provinces = {
      'Ontario': 'ON', 'Quebec': 'QC', 'British Columbia': 'BC',
      'Alberta': 'AB', 'Manitoba': 'MB', 'Saskatchewan': 'SK',
      'Nova Scotia': 'NS', 'New Brunswick': 'NB', 'Newfoundland': 'NL',
      'Prince Edward Island': 'PE', 'Northwest Territories': 'NT',
      'Yukon': 'YT', 'Nunavut': 'NU'
    };

    // Check if location contains Canada
    if (!locationStr.toLowerCase().includes('canada') && 
        !locationStr.match(/\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|NT|YT|NU)\b/)) {
      // Check for Canadian city
      const hasCanadianCity = canadianCities.some(city => 
        locationStr.includes(city)
      );
      if (!hasCanadianCity) return null;
    }

    const address: any = { country: 'Canada' };

    // Extract city
    for (const city of canadianCities) {
      if (locationStr.includes(city)) {
        address.city = city;
        break;
      }
    }

    // Extract province
    for (const [name, code] of Object.entries(provinces)) {
      if (locationStr.includes(name) || locationStr.includes(code)) {
        address.province = code;
        break;
      }
    }

    return Object.keys(address).length > 1 ? address : null;
  }

  /**
   * Extract contact info from text
   */
  private extractContactInfo(text: string): { email?: string; phone?: string } {
    const contact: { email?: string; phone?: string } = {};

    // Email pattern
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      contact.email = this.cleanEmail(emailMatch[0]);
    }

    // Phone pattern
    const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
    if (phoneMatch) {
      contact.phone = this.cleanPhone(phoneMatch[0]);
    }

    return contact;
  }

  /**
   * Check if content is Indigenous-related
   */
  private isIndigenousRelated(text: string): boolean {
    const indigenousKeywords = [
      'indigenous', 'first nations', 'métis', 'metis', 'inuit',
      'aboriginal', 'native', 'treaty', 'band', 'tribal',
      'nation', 'cree', 'ojibwe', 'mohawk', 'mi\'kmaq',
      '#indigenous', '#firstnations', '#metis', '#inuit'
    ];

    const lowerText = text.toLowerCase();
    return indigenousKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if business is relevant
   */
  private isRelevantBusiness(business: DiscoveredBusiness): boolean {
    // Must be Canadian or location unknown
    if (business.address && business.address.country !== 'Canada') {
      return false;
    }

    // Accept if Indigenous-related or no specific classification yet
    return true;
  }

  /**
   * Generate hash
   */
  private generateHash(input: string): string {
    return require('crypto').createHash('md5').update(input).digest('hex');
  }
}