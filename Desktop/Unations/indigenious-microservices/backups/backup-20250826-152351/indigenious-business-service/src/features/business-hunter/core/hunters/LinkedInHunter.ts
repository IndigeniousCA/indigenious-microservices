/**
 * LinkedIn Business Hunter
 * Discovers businesses and contacts through LinkedIn
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

export class LinkedInHunter extends BaseHunter {
  private readonly apiKey?: string;
  private readonly searchPatterns = [
    'Indigenous business Canada',
    'First Nations business',
    'Métis business Canada',
    'Inuit business Canada',
    'Aboriginal business Canada',
    'Indigenous entrepreneur Canada',
    'Indigenous owned company',
    'First Nations company Canada',
    'Indigenous supplier Canada',
    'Indigenous contractor Canada'
  ];

  constructor(config: HunterConfig, redis: Redis) {
    super(config, redis);
    this.apiKey = process.env.LINKEDIN_API_KEY;
  }

  /**
   * Hunt for businesses on LinkedIn
   */
  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const searchQuery = options?.query || this.searchPatterns[0];

    this.logger.info(`LinkedIn hunter starting with query: ${searchQuery}`, {
      source,
      hunterId: this.id
    });

    try {
      // Use LinkedIn API if available
      if (this.apiKey) {
        const apiResults = await this.searchViaAPI(searchQuery, options);
        businesses.push(...apiResults);
      } else {
        // Fallback to web scraping
        const scrapedResults = await this.searchViaScraping(searchQuery, options);
        businesses.push(...scrapedResults);
      }

      // Search company pages
      const companyResults = await this.searchCompanyPages(searchQuery);
      businesses.push(...companyResults);

      // Search posts for business mentions
      const postResults = await this.searchPosts(searchQuery);
      businesses.push(...postResults);

      this.logger.info(`LinkedIn hunter completed`, {
        discovered: businesses.length,
        query: searchQuery
      });

    } catch (error) {
      this.logger.error('LinkedIn hunting failed:', error);
      this.stats.errors++;
    }

    return businesses;
  }

  /**
   * Search via LinkedIn API
   */
  private async searchViaAPI(query: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    try {
      // LinkedIn API endpoints (requires proper OAuth)
      const searchUrl = `https://api.linkedin.com/v2/search`;
      
      const response = await this.httpClient.get(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Restli-Protocol-Version': '2.0.0'
        },
        params: {
          q: 'companies',
          keywords: query,
          locationFacet: 'ca', // Canada
          count: 50
        }
      });

      if (response.data?.elements) {
        for (const company of response.data.elements) {
          const business = await this.parseAPICompany(company);
          if (business) {
            businesses.push(business);
          }
        }
      }

    } catch (error) {
      this.logger.error('LinkedIn API search failed:', error);
    }

    return businesses;
  }

  /**
   * Search via web scraping
   */
  private async searchViaScraping(query: string, options?: any): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodedQuery}&origin=GLOBAL_SEARCH_HEADER`;

    try {
      const response = await this.httpClient.get(searchUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-CA,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Parse search results
      $('.search-result__wrapper').each((index, element) => {
        try {
          const $result = $(element);
          const business = this.parseSearchResult($, $result);
          
          if (business && this.isRelevantBusiness(business)) {
            businesses.push(business);
          }
        } catch (error) {
          this.logger.debug('Failed to parse search result:', error);
        }
      });

    } catch (error) {
      this.logger.error('LinkedIn scraping failed:', error);
    }

    return businesses;
  }

  /**
   * Search company pages directly
   */
  private async searchCompanyPages(query: string): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const companyUrls = await this.findCompanyUrls(query);

    for (const url of companyUrls.slice(0, 20)) { // Limit to 20 companies
      try {
        const business = await this.scrapeCompanyPage(url);
        if (business) {
          businesses.push(business);
        }
        
        // Rate limiting
        await this.sleep(2000);
      } catch (error) {
        this.logger.debug(`Failed to scrape company page ${url}:`, error);
      }
    }

    return businesses;
  }

  /**
   * Search posts for business mentions
   */
  private async searchPosts(query: string): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodedQuery}`;

    try {
      const response = await this.httpClient.get(searchUrl);
      const $ = cheerio.load(response.data);

      $('.feed-shared-update-v2').each((index, element) => {
        const $post = $(element);
        const businessMentions = this.extractBusinessMentions($, $post);
        
        for (const mention of businessMentions) {
          if (this.isRelevantBusiness(mention)) {
            businesses.push(mention);
          }
        }
      });

    } catch (error) {
      this.logger.error('Post search failed:', error);
    }

    return businesses;
  }

  /**
   * Parse API company data
   */
  private async parseAPICompany(companyData: any): Promise<DiscoveredBusiness | null> {
    try {
      const business: DiscoveredBusiness = {
        id: this.generateHash(`linkedin-${companyData.id}`),
        name: companyData.localizedName || companyData.name,
        description: companyData.description?.localized?.['en_US'],
        website: companyData.websiteUrl,
        type: BusinessType.UNKNOWN,
        industry: companyData.industries?.map((i: any) => i.localizedName) || [],
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'LinkedIn API',
          url: `https://www.linkedin.com/company/${companyData.vanityName || companyData.id}`,
          reliability: 0.9
        },
        discoveredAt: new Date(),
        confidence: 0.8,
        rawData: companyData
      };

      // Extract location
      if (companyData.locations?.length > 0) {
        const primaryLocation = companyData.locations[0];
        business.address = {
          city: primaryLocation.city,
          province: this.mapToProvince(primaryLocation.geographicArea),
          country: primaryLocation.country || 'Canada'
        };
      }

      // Check if Indigenous-related
      if (this.isIndigenousRelated(business)) {
        business.type = BusinessType.INDIGENOUS_AFFILIATED;
        business.confidence = 0.9;
      }

      return business;

    } catch (error) {
      this.logger.error('Failed to parse API company:', error);
      return null;
    }
  }

  /**
   * Parse search result from HTML
   */
  private parseSearchResult($: cheerio.CheerioStatic, $result: cheerio.Cheerio): DiscoveredBusiness | null {
    try {
      const name = $result.find('.entity-result__title-text a').first().text().trim();
      const profileUrl = $result.find('.entity-result__title-text a').attr('href');
      const description = $result.find('.entity-result__summary').text().trim();
      const industry = $result.find('.entity-result__primary-subtitle').text().trim();
      const location = $result.find('.entity-result__secondary-subtitle').text().trim();

      if (!name) return null;

      const business: DiscoveredBusiness = {
        id: this.generateHash(`linkedin-${profileUrl || name}`),
        name: this.cleanBusinessName(name),
        description: description || undefined,
        type: BusinessType.UNKNOWN,
        industry: industry ? [industry] : [],
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'LinkedIn',
          url: profileUrl ? `https://www.linkedin.com${profileUrl}` : undefined,
          reliability: 0.7
        },
        discoveredAt: new Date(),
        confidence: 0.6,
        rawData: {
          profileUrl,
          location
        }
      };

      // Parse location
      if (location) {
        const locationParts = location.split(',').map(s => s.trim());
        business.address = {
          city: locationParts[0],
          province: this.mapToProvince(locationParts[1]),
          country: 'Canada'
        };
      }

      return business;

    } catch (error) {
      this.logger.debug('Failed to parse search result:', error);
      return null;
    }
  }

  /**
   * Scrape company page
   */
  private async scrapeCompanyPage(url: string): Promise<DiscoveredBusiness | null> {
    try {
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);

      const name = $('h1.org-top-card-summary__title').text().trim();
      const tagline = $('.org-top-card-summary__tagline').text().trim();
      const overview = $('.org-about-us-organization-description__text').text().trim();
      const website = $('.org-about-us-company-module__website a').attr('href');
      const industry = $('.org-top-card-summary__industry').text().trim();
      const size = $('.org-top-card-summary__info-item:contains("employees")').text().trim();
      const location = $('.org-top-card-summary__headquarters').text().trim();

      if (!name) return null;

      const business: DiscoveredBusiness = {
        id: this.generateHash(`linkedin-company-${url}`),
        name: this.cleanBusinessName(name),
        description: overview || tagline || undefined,
        website: this.cleanUrl(website),
        type: BusinessType.UNKNOWN,
        industry: industry ? [industry] : [],
        source: {
          type: SourceType.SOCIAL_MEDIA,
          name: 'LinkedIn Company Page',
          url,
          reliability: 0.85
        },
        discoveredAt: new Date(),
        confidence: 0.75,
        rawData: {
          tagline,
          size,
          location
        }
      };

      // Parse employee count
      if (size) {
        const sizeMatch = size.match(/(\d+)/);
        if (sizeMatch) {
          business.rawData.employeeCount = parseInt(sizeMatch[1]);
        }
      }

      // Parse location
      if (location) {
        const locationParts = location.split(',').map(s => s.trim());
        business.address = {
          city: locationParts[0],
          province: this.mapToProvince(locationParts[1]),
          country: locationParts[2] || 'Canada'
        };
      }

      // Extract contact info
      const contactInfo = this.extractContactInfo($);
      if (contactInfo.phone) business.phone = contactInfo.phone;
      if (contactInfo.email) business.email = contactInfo.email;

      // Check Indigenous affiliation
      if (this.isIndigenousRelated(business)) {
        business.type = BusinessType.INDIGENOUS_AFFILIATED;
        business.confidence = 0.85;
      }

      return business;

    } catch (error) {
      this.logger.error(`Failed to scrape company page ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract business mentions from posts
   */
  private extractBusinessMentions($: cheerio.CheerioStatic, $post: cheerio.Cheerio): DiscoveredBusiness[] {
    const businesses: DiscoveredBusiness[] = [];
    const postText = $post.find('.feed-shared-text').text();
    const authorName = $post.find('.feed-shared-actor__name').text().trim();
    const authorTitle = $post.find('.feed-shared-actor__description').text().trim();

    // Look for business mentions in post
    const businessPatterns = [
      /(?:our company|we at|working at|CEO of|founder of|owner of)\s+([A-Z][A-Za-z0-9\s&\-\.]+)/gi,
      /([A-Z][A-Za-z0-9\s&\-\.]+)\s+(?:Inc|Corp|Ltd|Limited|LLC|LLP)/gi,
      /@([A-Za-z0-9\-]+)/g // Company mentions
    ];

    for (const pattern of businessPatterns) {
      const matches = postText.matchAll(pattern);
      for (const match of matches) {
        const businessName = match[1].trim();
        
        if (businessName && businessName.length > 3) {
          const business: DiscoveredBusiness = {
            id: this.generateHash(`linkedin-mention-${businessName}`),
            name: this.cleanBusinessName(businessName),
            description: `Mentioned by ${authorName} (${authorTitle})`,
            type: BusinessType.UNKNOWN,
            source: {
              type: SourceType.SOCIAL_MEDIA,
              name: 'LinkedIn Post',
              reliability: 0.5
            },
            discoveredAt: new Date(),
            confidence: 0.4,
            rawData: {
              postAuthor: authorName,
              authorTitle,
              postUrl: $post.find('.feed-shared-control-menu__trigger').attr('href')
            }
          };

          businesses.push(business);
        }
      }
    }

    return businesses;
  }

  /**
   * Find company URLs from search
   */
  private async findCompanyUrls(query: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Use Google to find LinkedIn company pages
      const googleQuery = `site:linkedin.com/company "${query}"`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;
      
      const response = await this.httpClient.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BusinessHunter/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      
      $('a[href*="linkedin.com/company/"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
          // Extract actual URL from Google's redirect
          const urlMatch = href.match(/linkedin\.com\/company\/[^&]+/);
          if (urlMatch) {
            urls.push(`https://www.${urlMatch[0]}`);
          }
        }
      });

    } catch (error) {
      this.logger.debug('Company URL search failed:', error);
    }

    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Extract contact information
   */
  private extractContactInfo($: cheerio.CheerioStatic): { phone?: string; email?: string } {
    const contact: { phone?: string; email?: string } = {};

    // Look for phone numbers
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const pageText = $.text();
    const phoneMatch = pageText.match(phoneRegex);
    if (phoneMatch) {
      contact.phone = this.cleanPhone(phoneMatch[0]);
    }

    // Look for emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = pageText.match(emailRegex);
    if (emailMatch) {
      // Filter out generic LinkedIn emails
      const validEmail = emailMatch.find(e => !e.includes('linkedin.com'));
      if (validEmail) {
        contact.email = this.cleanEmail(validEmail);
      }
    }

    return contact;
  }

  /**
   * Check if business is Indigenous-related
   */
  private isIndigenousRelated(business: DiscoveredBusiness): boolean {
    const indigenousKeywords = [
      'indigenous', 'first nations', 'métis', 'metis', 'inuit',
      'aboriginal', 'native american', 'treaty', 'band council',
      'tribal', 'nation', 'cree', 'ojibwe', 'mohawk', 'mi\'kmaq'
    ];

    const searchText = [
      business.name,
      business.description,
      business.industry?.join(' '),
      JSON.stringify(business.rawData)
    ].join(' ').toLowerCase();

    return indigenousKeywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Check if business is relevant to our search
   */
  private isRelevantBusiness(business: DiscoveredBusiness): boolean {
    // Must be Canadian
    if (business.address && business.address.country !== 'Canada') {
      return false;
    }

    // Check for Indigenous keywords or already classified
    return business.type !== BusinessType.UNKNOWN || this.isIndigenousRelated(business);
  }

  /**
   * Map location string to province code
   */
  private mapToProvince(location?: string): string | undefined {
    if (!location) return undefined;

    const provinceMap: Record<string, string> = {
      'ontario': 'ON',
      'quebec': 'QC',
      'québec': 'QC',
      'british columbia': 'BC',
      'alberta': 'AB',
      'manitoba': 'MB',
      'saskatchewan': 'SK',
      'nova scotia': 'NS',
      'new brunswick': 'NB',
      'newfoundland': 'NL',
      'prince edward island': 'PE',
      'northwest territories': 'NT',
      'yukon': 'YT',
      'nunavut': 'NU'
    };

    const lowerLocation = location.toLowerCase();
    
    for (const [name, code] of Object.entries(provinceMap)) {
      if (lowerLocation.includes(name)) {
        return code;
      }
    }

    // Check for province codes
    const codeMatch = location.match(/\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|NT|YT|NU)\b/);
    return codeMatch ? codeMatch[1] : undefined;
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