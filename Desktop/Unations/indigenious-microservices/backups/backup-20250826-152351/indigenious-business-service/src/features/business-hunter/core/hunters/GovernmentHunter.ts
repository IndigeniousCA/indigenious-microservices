/**
 * Government Source Hunter
 * Hunts businesses from federal and provincial government sources
 */

import * as cheerio from 'cheerio';
import { parse as csvParse } from 'csv-parse';
import { parseStringPromise as parseXml } from 'xml2js';
import { BaseHunter } from './BaseHunter';
import { 
  DiscoveredBusiness, 
  BusinessType, 
  SourceType,
  HunterConfig 
} from '../../types';
import { Redis } from 'ioredis';

interface GovernmentSource {
  name: string;
  url: string;
  type: 'api' | 'csv' | 'xml' | 'html';
  selector?: string; // For HTML sources
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export class GovernmentHunter extends BaseHunter {
  private readonly sources: Record<string, GovernmentSource[]> = {
    federal: [
      {
        name: 'ISC Registered Businesses',
        url: 'https://www.sac-isc.gc.ca/eng/1100100033057/1610723923360',
        type: 'html',
        selector: '.business-listing'
      },
      {
        name: 'PSPC Supplier Database',
        url: 'https://buyandsell.gc.ca/procurement-data/standing-offers-and-supply-arrangements',
        type: 'api',
        headers: {
          'Accept': 'application/json',
          'X-API-Version': '2.0'
        }
      },
      {
        name: 'Innovation Canada Business Database',
        url: 'https://innovation.ised-isde.canada.ca/innovation/api/businesses',
        type: 'api',
        params: {
          indigenous: true,
          limit: 1000
        }
      },
      {
        name: 'StatsCan Business Register',
        url: 'https://www150.statcan.gc.ca/n1/pub/61-525-x/61-525-x2021001-eng.csv',
        type: 'csv'
      }
    ],
    provincial: {
      ON: [
        {
          name: 'Ontario Business Registry',
          url: 'https://www.ontario.ca/page/public-information-ontario-businesses',
          type: 'api',
          headers: { 'X-API-Key': process.env.ONTARIO_API_KEY || '' }
        },
        {
          name: 'Ontario Indigenous Business Directory',
          url: 'https://www.ontario.ca/page/indigenous-business-directory/api/v1/businesses',
          type: 'api'
        }
      ],
      QC: [
        {
          name: 'Registraire des entreprises du Québec',
          url: 'https://www.registreentreprises.gouv.qc.ca/api/entreprises',
          type: 'api',
          params: { type: 'autochtone' }
        }
      ],
      BC: [
        {
          name: 'BC Registry Services',
          url: 'https://www.bcregistry.ca/business/api/search',
          type: 'api'
        },
        {
          name: 'Aboriginal Business Directory BC',
          url: 'https://www.aboriginalbusinessdirectorybc.com/api/listings',
          type: 'api'
        }
      ],
      AB: [
        {
          name: 'Alberta Indigenous Opportunities Corporation',
          url: 'https://www.theaioc.com/api/loan-recipients',
          type: 'api'
        }
      ],
      SK: [
        {
          name: 'Saskatchewan Companies Office',
          url: 'https://www.isc.ca/business/Pages/Search.aspx',
          type: 'html',
          selector: '.company-result'
        }
      ],
      MB: [
        {
          name: 'Manitoba Companies Office',
          url: 'https://companiesoffice.gov.mb.ca/api/search',
          type: 'api'
        }
      ],
      NS: [
        {
          name: 'Nova Scotia Business Registry',
          url: 'https://rjsc.novascotia.ca/api/businesses',
          type: 'api'
        }
      ],
      NB: [
        {
          name: 'Service New Brunswick Corporate Registry',
          url: 'https://www.pxw1.snb.ca/snb7001/b/APISearch.aspx',
          type: 'api'
        }
      ],
      PE: [
        {
          name: 'PEI Business Registry',
          url: 'https://www.princeedwardisland.ca/en/feature/pei-business-corporate-registry-original',
          type: 'html'
        }
      ],
      NL: [
        {
          name: 'Newfoundland Registry of Companies',
          url: 'https://cado.eservices.gov.nl.ca/CADOInternet/Company/CompanyNameNumberSearch.aspx',
          type: 'html'
        }
      ]
    },
    territorial: {
      YT: [
        {
          name: 'Yukon Corporate Registry',
          url: 'https://yukon.ca/en/doing-business/corporate-affairs/search-corporate-registry',
          type: 'html'
        }
      ],
      NT: [
        {
          name: 'NWT Corporate Registry',
          url: 'https://www.justice.gov.nt.ca/en/corporate-registry-search/',
          type: 'html'
        }
      ],
      NU: [
        {
          name: 'Nunavut Business Registry',
          url: 'https://gov.nu.ca/edt/business-registry',
          type: 'html'
        }
      ]
    }
  };
  
  constructor(config: HunterConfig, redis: Redis) {
    super(config, redis);
    this.setupGovernmentSources();
  }
  
  /**
   * Hunt businesses from government sources
   */
  async hunt(sourceUrl: string, options?: any): Promise<DiscoveredBusiness[]> {
    const source = this.findSourceByUrl(sourceUrl);
    if (!source) {
      throw new Error(`Unknown government source: ${sourceUrl}`);
    }
    
    this.logger.info(`Hunting from government source: ${source.name}`, {
      type: source.type,
      url: source.url
    });
    
    try {
      switch (source.type) {
        case 'api':
          return await this.huntFromAPI(source);
        case 'csv':
          return await this.huntFromCSV(source);
        case 'xml':
          return await this.huntFromXML(source);
        case 'html':
          return await this.huntFromHTML(source);
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }
    } catch (error) {
      this.logger.error(`Error hunting from ${source.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Hunt from API endpoint
   */
  private async huntFromAPI(source: GovernmentSource): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await this.httpClient.get(source.url, {
          headers: source.headers,
          params: {
            ...source.params,
            page,
            limit: 100
          }
        });
        
        if (!response.data || !Array.isArray(response.data.results)) {
          hasMore = false;
          break;
        }
        
        const pageBusiness = response.data.results.map((item: any) => 
          this.parseGovernmentBusiness(item, source.name)
        );
        
        businesses.push(...pageBusiness);
        
        // Check if there are more pages
        hasMore = response.data.hasMore || response.data.next || 
                  (response.data.total && businesses.length < response.data.total);
        page++;
        
        // Respect rate limits
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        this.logger.error(`API error on page ${page}:`, error);
        hasMore = false;
      }
    }
    
    return businesses;
  }
  
  /**
   * Hunt from CSV file
   */
  private async huntFromCSV(source: GovernmentSource): Promise<DiscoveredBusiness[]> {
    const response = await this.httpClient.get(source.url, {
      responseType: 'stream'
    });
    
    const businesses: DiscoveredBusiness[] = [];
    const parser = response.data.pipe(csvParse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    }));
    
    return new Promise((resolve, reject) => {
      parser.on('data', (row: any) => {
        try {
          const business = this.parseGovernmentBusiness(row, source.name);
          if (business.name) {
            businesses.push(business);
          }
        } catch (error) {
          this.logger.warn('Error parsing CSV row:', error);
        }
      });
      
      parser.on('error', reject);
      parser.on('end', () => resolve(businesses));
    });
  }
  
  /**
   * Hunt from XML feed
   */
  private async huntFromXML(source: GovernmentSource): Promise<DiscoveredBusiness[]> {
    const response = await this.httpClient.get(source.url);
    const result = await parseXml(response.data);
    
    const businesses: DiscoveredBusiness[] = [];
    const items = result.businesses?.business || result.root?.business || [];
    
    for (const item of items) {
      try {
        const business = this.parseGovernmentBusiness(item, source.name);
        if (business.name) {
          businesses.push(business);
        }
      } catch (error) {
        this.logger.warn('Error parsing XML item:', error);
      }
    }
    
    return businesses;
  }
  
  /**
   * Hunt from HTML page
   */
  private async huntFromHTML(source: GovernmentSource): Promise<DiscoveredBusiness[]> {
    const response = await this.httpClient.get(source.url);
    const $ = cheerio.load(response.data);
    const businesses: DiscoveredBusiness[] = [];
    
    // Use provided selector or common patterns
    const selectors = source.selector ? [source.selector] : [
      '.business-listing',
      '.company-result',
      'table.results tbody tr',
      '.search-result-item',
      'div[class*="business"]',
      'article.listing'
    ];
    
    for (const selector of selectors) {
      $(selector).each((_, element) => {
        try {
          const business = this.parseHTMLBusiness($, element, source.name);
          if (business.name) {
            businesses.push(business);
          }
        } catch (error) {
          this.logger.warn('Error parsing HTML element:', error);
        }
      });
      
      if (businesses.length > 0) break;
    }
    
    // Check for pagination
    const nextLink = $('a.next, a[rel="next"], .pagination a:contains("Next")').attr('href');
    if (nextLink && businesses.length > 0) {
      // Queue next page for hunting
      const nextUrl = new URL(nextLink, source.url).href;
      this.emit('queue-source', { url: nextUrl, source });
    }
    
    return businesses;
  }
  
  /**
   * Parse government business data
   */
  private parseGovernmentBusiness(data: any, sourceName: string): DiscoveredBusiness {
    // Try to determine if it's an Indigenous business
    const indigenousKeywords = [
      'indigenous', 'aboriginal', 'first nation', 'métis', 'metis', 
      'inuit', 'native', 'band', 'tribal', 'nation'
    ];
    
    const textContent = JSON.stringify(data).toLowerCase();
    const isIndigenous = indigenousKeywords.some(keyword => textContent.includes(keyword));
    
    // Extract business data with multiple fallbacks
    const business = this.normalizeBusinessData({
      name: data.businessName || data.name || data.company_name || data.legal_name,
      legalName: data.legalName || data.legal_name || data.registered_name,
      businessNumber: data.businessNumber || data.bn || data.business_number || 
                      data.registration_number || data.corp_num,
      description: data.description || data.business_description || data.activities,
      website: data.website || data.url || data.web_site || data.homepage,
      email: data.email || data.contact_email || data.email_address,
      phone: data.phone || data.telephone || data.phone_number || data.contact_phone,
      address: this.parseAddress(data),
      industry: this.parseIndustry(data),
      type: isIndigenous ? BusinessType.INDIGENOUS_OWNED : BusinessType.CANADIAN_GENERAL
    }, sourceName);
    
    // Add government-specific metadata
    business.confidence = 0.9; // High confidence for government sources
    business.source.type = SourceType.GOVERNMENT;
    
    return business;
  }
  
  /**
   * Parse HTML business listing
   */
  private parseHTMLBusiness($: cheerio.CheerioAPI, element: any, sourceName: string): DiscoveredBusiness {
    const $el = $(element);
    
    // Extract text content with various selectors
    const getName = () => {
      const selectors = ['.business-name', '.company-name', 'h3', 'h4', 'a.name', 'td:first-child'];
      for (const sel of selectors) {
        const text = $el.find(sel).first().text().trim();
        if (text) return text;
      }
      return $el.text().trim().split('\n')[0];
    };
    
    const business = this.normalizeBusinessData({
      name: getName(),
      businessNumber: $el.find('.business-number, .registration-number, .bn').text().trim(),
      description: $el.find('.description, .business-description').text().trim(),
      website: $el.find('a[href*="http"]').first().attr('href'),
      email: $el.find('a[href^="mailto:"]').attr('href')?.replace('mailto:', ''),
      phone: $el.find('.phone, .telephone, [href^="tel:"]').text().trim(),
      address: {
        street: $el.find('.address, .street').text().trim(),
        city: $el.find('.city').text().trim(),
        province: $el.find('.province, .state').text().trim(),
        postalCode: $el.find('.postal-code, .zip').text().trim(),
        country: 'Canada'
      }
    }, sourceName);
    
    return business;
  }
  
  /**
   * Parse address from various formats
   */
  private parseAddress(data: any): any {
    return {
      street: data.address || data.street_address || data.address_line_1,
      city: data.city || data.municipality,
      province: data.province || data.state || data.region,
      postalCode: data.postal_code || data.zip_code || data.postcode,
      country: data.country || 'Canada'
    };
  }
  
  /**
   * Parse industry/sector information
   */
  private parseIndustry(data: any): string[] {
    const industries: string[] = [];
    
    const fields = [
      data.industry, data.sector, data.business_type, 
      data.naics_code, data.sic_code, data.activities
    ].filter(Boolean);
    
    fields.forEach(field => {
      if (Array.isArray(field)) {
        industries.push(...field);
      } else if (typeof field === 'string') {
        industries.push(...field.split(/[,;|]/).map(s => s.trim()));
      }
    });
    
    return [...new Set(industries)];
  }
  
  /**
   * Setup government sources configuration
   */
  private setupGovernmentSources(): void {
    // Flatten all sources for easy access
    const allSources: string[] = [];
    
    Object.values(this.sources.federal).forEach(source => {
      allSources.push(source.url);
    });
    
    Object.values(this.sources.provincial).flat().forEach(source => {
      allSources.push(source.url);
    });
    
    Object.values(this.sources.territorial).flat().forEach(source => {
      allSources.push(source.url);
    });
    
    this.config.sources = allSources;
  }
  
  /**
   * Find source configuration by URL
   */
  private findSourceByUrl(url: string): GovernmentSource | undefined {
    // Check federal sources
    for (const source of this.sources.federal) {
      if (source.url === url) return source;
    }
    
    // Check provincial sources
    for (const sources of Object.values(this.sources.provincial)) {
      for (const source of sources) {
        if (source.url === url) return source;
      }
    }
    
    // Check territorial sources
    for (const sources of Object.values(this.sources.territorial)) {
      for (const source of sources) {
        if (source.url === url) return source;
      }
    }
    
    return undefined;
  }
}