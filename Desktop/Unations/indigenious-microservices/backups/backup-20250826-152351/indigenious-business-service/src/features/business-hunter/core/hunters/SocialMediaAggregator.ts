/**
 * Social Media Hunter Aggregator
 * Coordinates all social media hunters for comprehensive discovery
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { createLogger } from '../utils/logger';
import { LinkedInHunter } from './LinkedInHunter';
import { TwitterHunter } from './TwitterHunter';
import { InstagramHunter } from './InstagramHunter';
import { TikTokHunter } from './TikTokHunter';
import {
  DiscoveredBusiness,
  HunterConfig,
  HuntingResult,
  HuntingStats,
  HuntingError,
  HunterType
} from '../../types';

export interface SocialMediaConfig {
  enableLinkedIn: boolean;
  enableTwitter: boolean;
  enableInstagram: boolean;
  enableTikTok: boolean;
  enableReddit: boolean;
  enableYouTube: boolean;
  enableFacebook: boolean;
  maxConcurrentHunters: number;
  deduplicationEnabled: boolean;
}

export class SocialMediaAggregator extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly config: SocialMediaConfig;
  private readonly hunters: Map<string, any>;
  private isRunning: boolean = false;

  constructor(redis: Redis, config?: Partial<SocialMediaConfig>) {
    super();
    this.logger = createLogger('social-media-aggregator');
    this.redis = redis;
    
    // Default configuration
    this.config = {
      enableLinkedIn: true,
      enableTwitter: true,
      enableInstagram: true,
      enableTikTok: true,
      enableReddit: false, // Not implemented yet
      enableYouTube: false, // Not implemented yet
      enableFacebook: false, // Not implemented yet
      maxConcurrentHunters: 3,
      deduplicationEnabled: true,
      ...config
    };

    this.hunters = new Map();
    this.initializeHunters();
  }

  /**
   * Initialize social media hunters
   */
  private initializeHunters(): void {
    const hunterConfigs: Record<string, HunterConfig> = {
      linkedin: {
        id: 'linkedin-hunter-1',
        type: HunterType.SOCIAL_MEDIA,
        sources: ['https://www.linkedin.com'],
        rateLimit: 30,
        priority: 1,
        enabled: this.config.enableLinkedIn
      },
      twitter: {
        id: 'twitter-hunter-1',
        type: HunterType.SOCIAL_MEDIA,
        sources: ['https://twitter.com'],
        rateLimit: 300,
        priority: 2,
        enabled: this.config.enableTwitter
      },
      instagram: {
        id: 'instagram-hunter-1',
        type: HunterType.SOCIAL_MEDIA,
        sources: ['https://www.instagram.com'],
        rateLimit: 60,
        priority: 3,
        enabled: this.config.enableInstagram
      },
      tiktok: {
        id: 'tiktok-hunter-1',
        type: HunterType.SOCIAL_MEDIA,
        sources: ['https://www.tiktok.com'],
        rateLimit: 100,
        priority: 4,
        enabled: this.config.enableTikTok
      }
    };

    // Create hunters
    if (this.config.enableLinkedIn) {
      this.hunters.set('linkedin', new LinkedInHunter(hunterConfigs.linkedin, this.redis));
    }
    if (this.config.enableTwitter) {
      this.hunters.set('twitter', new TwitterHunter(hunterConfigs.twitter, this.redis));
    }
    if (this.config.enableInstagram) {
      this.hunters.set('instagram', new InstagramHunter(hunterConfigs.instagram, this.redis));
    }
    if (this.config.enableTikTok) {
      this.hunters.set('tiktok', new TikTokHunter(hunterConfigs.tiktok, this.redis));
    }

    this.logger.info(`Initialized ${this.hunters.size} social media hunters`);
  }

  /**
   * Start comprehensive social media hunting
   */
  async startHunting(options?: {
    queries?: string[];
    hashtags?: string[];
    locations?: string[];
    maxResults?: number;
  }): Promise<HuntingResult> {
    if (this.isRunning) {
      throw new Error('Social media hunting is already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const allBusinesses: DiscoveredBusiness[] = [];
    const errors: HuntingError[] = [];
    const stats: Record<string, HuntingStats> = {};

    this.logger.info('Starting comprehensive social media hunting', {
      enabledPlatforms: Array.from(this.hunters.keys()),
      options
    });

    try {
      // Default search terms if not provided
      const queries = options?.queries || [
        'Indigenous business Canada',
        'First Nations business',
        'Métis business',
        'Inuit business'
      ];

      const hashtags = options?.hashtags || [
        'indigenousbusiness',
        'firstnationsbusiness',
        'buyindigenous',
        'indigenousowned'
      ];

      // Run hunters in parallel batches
      const hunterEntries = Array.from(this.hunters.entries());
      const batchSize = this.config.maxConcurrentHunters;

      for (let i = 0; i < hunterEntries.length; i += batchSize) {
        const batch = hunterEntries.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async ([platform, hunter]) => {
          try {
            this.logger.info(`Starting ${platform} hunter`);
            
            const platformBusinesses: DiscoveredBusiness[] = [];
            
            // Search with queries
            for (const query of queries) {
              const results = await hunter.hunt(platform, { query });
              platformBusinesses.push(...results);
              
              // Rate limiting between queries
              await this.sleep(2000);
            }

            // Search with hashtags (for platforms that support it)
            if (['instagram', 'twitter', 'tiktok'].includes(platform)) {
              for (const hashtag of hashtags) {
                const results = await hunter.hunt(platform, { hashtag });
                platformBusinesses.push(...results);
                
                await this.sleep(2000);
              }
            }

            // Deduplicate platform results
            const uniqueBusinesses = this.config.deduplicationEnabled 
              ? await this.deduplicatePlatformResults(platformBusinesses, platform)
              : platformBusinesses;

            allBusinesses.push(...uniqueBusinesses);

            // Collect stats
            stats[platform] = {
              discovered: uniqueBusinesses.length,
              validated: 0,
              enriched: 0,
              duplicates: platformBusinesses.length - uniqueBusinesses.length,
              errors: 0,
              duration: Date.now() - startTime,
              source: platform
            };

            this.logger.info(`${platform} hunter completed`, stats[platform]);

          } catch (error) {
            this.logger.error(`${platform} hunter failed:`, error);
            errors.push({
              code: 'PLATFORM_ERROR',
              message: error.message,
              source: platform,
              timestamp: new Date()
            });
            stats[platform] = {
              discovered: 0,
              validated: 0,
              enriched: 0,
              duplicates: 0,
              errors: 1,
              duration: Date.now() - startTime,
              source: platform
            };
          }
        });

        await Promise.allSettled(batchPromises);
        
        // Progress update
        this.emit('batch:complete', {
          completedPlatforms: i + batch.length,
          totalPlatforms: hunterEntries.length,
          businessesFound: allBusinesses.length
        });
      }

      // Final cross-platform deduplication
      const finalBusinesses = this.config.deduplicationEnabled
        ? await this.crossPlatformDeduplication(allBusinesses)
        : allBusinesses;

      // Calculate aggregate stats
      const aggregateStats: HuntingStats = {
        discovered: finalBusinesses.length,
        validated: Object.values(stats).reduce((sum, s) => sum + s.validated, 0),
        enriched: Object.values(stats).reduce((sum, s) => sum + s.enriched, 0),
        duplicates: allBusinesses.length - finalBusinesses.length,
        errors: errors.length,
        duration: Date.now() - startTime,
        source: 'social_media_aggregator'
      };

      const result: HuntingResult = {
        taskId: `social-media-hunt-${Date.now()}`,
        hunterId: 'social-media-aggregator',
        businesses: finalBusinesses,
        stats: aggregateStats,
        errors,
        platformStats: stats
      };

      this.logger.info('Social media hunting completed', {
        totalBusinesses: finalBusinesses.length,
        platforms: Object.keys(stats),
        duration: aggregateStats.duration
      });

      this.emit('hunting:complete', result);

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Deduplicate results within a platform
   */
  private async deduplicatePlatformResults(
    businesses: DiscoveredBusiness[],
    platform: string
  ): Promise<DiscoveredBusiness[]> {
    const unique: DiscoveredBusiness[] = [];
    const seen = new Map<string, DiscoveredBusiness>();

    for (const business of businesses) {
      const key = this.generateBusinessKey(business);
      
      if (!seen.has(key)) {
        seen.set(key, business);
        unique.push(business);
      } else {
        // Merge information from duplicate
        const existing = seen.get(key)!;
        this.mergeBusinessInfo(existing, business);
        
        this.logger.debug(`Duplicate found on ${platform}: ${business.name}`);
      }
    }

    return unique;
  }

  /**
   * Cross-platform deduplication
   */
  private async crossPlatformDeduplication(
    businesses: DiscoveredBusiness[]
  ): Promise<DiscoveredBusiness[]> {
    const unique: DiscoveredBusiness[] = [];
    const businessMap = new Map<string, DiscoveredBusiness>();

    // Group by potential matches
    for (const business of businesses) {
      const keys = this.generateMatchKeys(business);
      
      let matched = false;
      for (const key of keys) {
        if (businessMap.has(key)) {
          // Merge with existing
          const existing = businessMap.get(key)!;
          this.mergeBusinessInfo(existing, business);
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Add as new business
        for (const key of keys) {
          businessMap.set(key, business);
        }
        unique.push(business);
      }
    }

    this.logger.info(`Cross-platform deduplication: ${businesses.length} -> ${unique.length}`);

    return unique;
  }

  /**
   * Generate unique key for business
   */
  private generateBusinessKey(business: DiscoveredBusiness): string {
    const parts = [
      business.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      business.businessNumber || '',
      business.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
      business.phone?.replace(/\D/g, '') || ''
    ].filter(Boolean);

    return parts.join(':');
  }

  /**
   * Generate multiple match keys for fuzzy matching
   */
  private generateMatchKeys(business: DiscoveredBusiness): string[] {
    const keys: string[] = [];
    const normalizedName = business.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Business number is most reliable
    if (business.businessNumber) {
      keys.push(`bn:${business.businessNumber}`);
    }

    // Website domain
    if (business.website) {
      const domain = this.extractDomain(business.website);
      keys.push(`domain:${domain}`);
    }

    // Phone number
    if (business.phone) {
      const cleanPhone = business.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        keys.push(`phone:${cleanPhone}`);
      }
    }

    // Name variations
    keys.push(`name:${normalizedName}`);
    
    // Name without common suffixes
    const nameParts = normalizedName.replace(/(inc|corp|ltd|limited|llc|llp)$/, '').trim();
    if (nameParts !== normalizedName) {
      keys.push(`name:${nameParts}`);
    }

    return keys;
  }

  /**
   * Merge information from duplicate businesses
   */
  private mergeBusinessInfo(existing: DiscoveredBusiness, duplicate: DiscoveredBusiness): void {
    // Update with better data
    if (!existing.description && duplicate.description) {
      existing.description = duplicate.description;
    }
    
    if (!existing.website && duplicate.website) {
      existing.website = duplicate.website;
    }
    
    if (!existing.email && duplicate.email) {
      existing.email = duplicate.email;
    }
    
    if (!existing.phone && duplicate.phone) {
      existing.phone = duplicate.phone;
    }
    
    if (!existing.address && duplicate.address) {
      existing.address = duplicate.address;
    }

    // Merge industries
    if (duplicate.industry) {
      existing.industry = existing.industry || [];
      for (const ind of duplicate.industry) {
        if (!existing.industry.includes(ind)) {
          existing.industry.push(ind);
        }
      }
    }

    // Update confidence based on multiple sources
    existing.confidence = Math.min(
      (existing.confidence + duplicate.confidence) / 1.5,
      0.95
    );

    // Track all sources
    if (!existing.rawData) existing.rawData = {};
    if (!existing.rawData.sources) existing.rawData.sources = [];
    existing.rawData.sources.push({
      platform: duplicate.source.name,
      url: duplicate.source.url,
      discoveredAt: duplicate.discoveredAt
    });
  }

  /**
   * Search specific platform
   */
  async searchPlatform(
    platform: 'linkedin' | 'twitter' | 'instagram' | 'tiktok',
    options: any
  ): Promise<DiscoveredBusiness[]> {
    const hunter = this.hunters.get(platform);
    if (!hunter) {
      throw new Error(`${platform} hunter not enabled`);
    }

    return await hunter.hunt(platform, options);
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [platform, hunter] of this.hunters) {
      stats[platform] = {
        enabled: true,
        rateLimit: hunter.config?.rateLimit,
        hasAPIKey: this.checkAPIKey(platform)
      };
    }

    return stats;
  }

  /**
   * Check if platform has API key configured
   */
  private checkAPIKey(platform: string): boolean {
    const apiKeys = {
      linkedin: 'LINKEDIN_API_KEY',
      twitter: 'TWITTER_API_KEY',
      instagram: 'INSTAGRAM_API_KEY',
      tiktok: 'TIKTOK_API_KEY'
    };

    return !!process.env[apiKeys[platform as keyof typeof apiKeys]];
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    
    for (const [platform, hunter] of this.hunters) {
      try {
        await hunter.cleanup();
      } catch (error) {
        this.logger.error(`Failed to cleanup ${platform} hunter:`, error);
      }
    }
    
    this.hunters.clear();
  }
}