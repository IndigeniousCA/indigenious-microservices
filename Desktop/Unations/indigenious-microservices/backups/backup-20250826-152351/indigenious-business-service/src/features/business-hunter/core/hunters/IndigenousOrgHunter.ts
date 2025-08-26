/**
 * Indigenous Organizations Hunter
 * Hunts businesses from Indigenous organizations and associations
 */

import * as cheerio from 'cheerio';
import { BaseHunter } from './BaseHunter';
import { 
  DiscoveredBusiness, 
  BusinessType, 
  SourceType,
  HunterConfig,
  IndigenousDetails 
} from '../../types';
import { Redis } from 'ioredis';

interface IndigenousOrgSource {
  name: string;
  url: string;
  type: 'api' | 'directory' | 'html';
  organization: string;
  region?: string;
  headers?: Record<string, string>;
}

export class IndigenousOrgHunter extends BaseHunter {
  private readonly sources: IndigenousOrgSource[] = [
    // National Organizations
    {
      name: 'Canadian Council for Aboriginal Business (CCAB)',
      url: 'https://www.ccab.com/main/ccab_member_directory/',
      type: 'directory',
      organization: 'CCAB'
    },
    {
      name: 'CCAB Certified Aboriginal Businesses',
      url: 'https://www.ccab.com/uploads/2021-PAR-Certified-Companies.pdf',
      type: 'api',
      organization: 'CCAB',
      headers: {
        'X-API-Key': process.env.CCAB_API_KEY || ''
      }
    },
    {
      name: 'Assembly of First Nations Business Directory',
      url: 'https://www.afn.ca/business-directory/',
      type: 'html',
      organization: 'AFN'
    },
    {
      name: 'Inuit Tapiriit Kanatami Business Registry',
      url: 'https://www.itk.ca/business-registry/',
      type: 'api',
      organization: 'ITK'
    },
    {
      name: 'Métis National Council Business Network',
      url: 'https://www.metisnation.ca/business-directory',
      type: 'html',
      organization: 'MNC'
    },
    {
      name: 'Congress of Aboriginal Peoples Directory',
      url: 'http://www.abo-peoples.org/business/',
      type: 'html',
      organization: 'CAP'
    },
    
    // Regional Organizations
    {
      name: 'First Nations of Quebec and Labrador Economic Development Commission',
      url: 'https://cdepnql.org/en/directory/',
      type: 'directory',
      organization: 'FNQLEDC',
      region: 'QC'
    },
    {
      name: 'Aboriginal Business Association of BC',
      url: 'https://www.aboriginalbusinessassociation.com/directory',
      type: 'html',
      organization: 'ABABC',
      region: 'BC'
    },
    {
      name: 'Saskatchewan First Nations Economic Development Network',
      url: 'https://sfnedn.com/business-directory/',
      type: 'directory',
      organization: 'SFNEDN',
      region: 'SK'
    },
    {
      name: 'Manitoba Indigenous Business Directory',
      url: 'https://indigenousbusinessdirectory.ca/',
      type: 'api',
      organization: 'MIBD',
      region: 'MB'
    },
    {
      name: 'Ontario First Nations Economic Developers Association',
      url: 'https://www.ofneda.ca/member-directory/',
      type: 'html',
      organization: 'OFNEDA',
      region: 'ON'
    },
    {
      name: 'Atlantic Indigenous Business Network',
      url: 'https://www.apcfnc.ca/business-network/',
      type: 'directory',
      organization: 'AIBN',
      region: 'Atlantic'
    },
    
    // Specific Nation/Tribal Councils
    {
      name: 'Cree Nation Business Directory',
      url: 'https://www.creenation-at.com/business-directory/',
      type: 'html',
      organization: 'Cree Nation'
    },
    {
      name: 'Mohawk Council Business Registry',
      url: 'https://www.kahnawake.com/businesses/',
      type: 'html',
      organization: 'MCK'
    },
    {
      name: 'Mi\'kmaq Business Directory',
      url: 'https://mikmaqbusiness.ca/directory/',
      type: 'directory',
      organization: 'Mi\'kmaq'
    },
    
    // Economic Development Corporations
    {
      name: 'Aboriginal Financial Institutions',
      url: 'https://nacca.ca/aboriginal-financial-institutions/',
      type: 'api',
      organization: 'NACCA'
    },
    {
      name: 'First Nations Finance Authority Partners',
      url: 'https://fnfa.ca/en/fnfa-members/',
      type: 'html',
      organization: 'FNFA'
    }
  ];
  
  constructor(config: HunterConfig, redis: Redis) {
    super(config, redis);
    this.config.sources = this.sources.map(s => s.url);
  }
  
  /**
   * Hunt businesses from Indigenous organization sources
   */
  async hunt(sourceUrl: string, options?: any): Promise<DiscoveredBusiness[]> {
    const source = this.sources.find(s => s.url === sourceUrl);
    if (!source) {
      throw new Error(`Unknown Indigenous organization source: ${sourceUrl}`);
    }
    
    this.logger.info(`Hunting from Indigenous organization: ${source.name}`, {
      type: source.type,
      organization: source.organization,
      region: source.region
    });
    
    try {
      switch (source.type) {
        case 'api':
          return await this.huntFromAPI(source);
        case 'directory':
          return await this.huntFromDirectory(source);
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
  private async huntFromAPI(source: IndigenousOrgSource): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    
    try {
      const response = await this.httpClient.get(source.url, {
        headers: source.headers || {}
      });
      
      let items: any[] = [];
      
      // Handle different API response formats
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data.businesses) {
        items = response.data.businesses;
      } else if (response.data.members) {
        items = response.data.members;
      } else if (response.data.results) {
        items = response.data.results;
      }
      
      for (const item of items) {
        const business = this.parseIndigenousBusiness(item, source);
        if (business.name) {
          businesses.push(business);
        }
      }
      
    } catch (error) {
      this.logger.error(`API error for ${source.name}:`, error);
    }
    
    return businesses;
  }
  
  /**
   * Hunt from directory-style listings
   */
  private async huntFromDirectory(source: IndigenousOrgSource): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 50) { // Limit pages to prevent infinite loops
      try {
        const response = await this.httpClient.get(source.url, {
          params: { page, per_page: 50 }
        });
        
        const $ = cheerio.load(response.data);
        
        // Common directory selectors
        const selectors = [
          '.directory-item',
          '.business-card',
          '.member-listing',
          'article.business',
          '.listing-item',
          'div[class*="business"]'
        ];
        
        let foundItems = false;
        for (const selector of selectors) {
          const items = $(selector);
          if (items.length > 0) {
            foundItems = true;
            items.each((_, element) => {
              const business = this.parseDirectoryBusiness($, element, source);
              if (business.name) {
                businesses.push(business);
              }
            });
            break;
          }
        }
        
        // Check for next page
        const hasNextPage = $('.pagination .next:not(.disabled)').length > 0 ||
                           $('a:contains("Next")').length > 0 ||
                           businesses.length === 50;
        
        hasMore = foundItems && hasNextPage;
        page++;
        
        // Rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        this.logger.error(`Directory error on page ${page}:`, error);
        hasMore = false;
      }
    }
    
    return businesses;
  }
  
  /**
   * Hunt from HTML pages
   */
  private async huntFromHTML(source: IndigenousOrgSource): Promise<DiscoveredBusiness[]> {
    const response = await this.httpClient.get(source.url);
    const $ = cheerio.load(response.data);
    const businesses: DiscoveredBusiness[] = [];
    
    // Look for business listings in various formats
    const businessElements: any[] = [];
    
    // Tables
    $('table').each((_, table) => {
      const headers = $(table).find('th').map((_, th) => $(th).text().toLowerCase()).get();
      if (headers.some(h => h.includes('business') || h.includes('company'))) {
        $(table).find('tbody tr').each((_, row) => {
          businessElements.push({ type: 'table-row', element: row, headers });
        });
      }
    });
    
    // Lists
    $('ul li, ol li').each((_, li) => {
      const text = $(li).text();
      if (text.length > 20 && text.length < 500) {
        businessElements.push({ type: 'list-item', element: li });
      }
    });
    
    // Cards/Divs
    $('[class*="business"], [class*="member"], [class*="listing"]').each((_, div) => {
      businessElements.push({ type: 'card', element: div });
    });
    
    // Process found elements
    for (const { type, element, headers } of businessElements) {
      try {
        let business: DiscoveredBusiness | null = null;
        
        switch (type) {
          case 'table-row':
            business = this.parseTableRowBusiness($, element, headers, source);
            break;
          case 'list-item':
            business = this.parseListItemBusiness($, element, source);
            break;
          case 'card':
            business = this.parseCardBusiness($, element, source);
            break;
        }
        
        if (business?.name) {
          businesses.push(business);
        }
      } catch (error) {
        this.logger.warn('Error parsing business element:', error);
      }
    }
    
    return businesses;
  }
  
  /**
   * Parse Indigenous business data
   */
  private parseIndigenousBusiness(data: any, source: IndigenousOrgSource): DiscoveredBusiness {
    const business = this.normalizeBusinessData({
      name: data.businessName || data.name || data.companyName || data.organizationName,
      legalName: data.legalName || data.registeredName,
      businessNumber: data.businessNumber || data.registrationNumber || data.bnNumber,
      description: data.description || data.about || data.services,
      website: data.website || data.url || data.webAddress,
      email: data.email || data.contactEmail,
      phone: data.phone || data.telephone || data.contactPhone,
      address: {
        street: data.address || data.streetAddress,
        city: data.city || data.community,
        province: data.province || data.territory || source.region,
        postalCode: data.postalCode || data.postal,
        country: 'Canada',
        isOnReserve: data.onReserve || data.reserveLocation || false,
        territoryName: data.territory || data.traditionalTerritory
      },
      industry: this.parseIndustries(data),
      type: BusinessType.INDIGENOUS_OWNED
    }, source.url);
    
    // Enhance with Indigenous-specific details
    const indigenousDetails: IndigenousDetails = {
      ownershipPercentage: data.indigenousOwnership || 
                          (data.ownershipType === 'full' ? 100 : 51),
      nation: data.nation || data.firstNation || data.tribe || source.organization,
      community: data.community || data.band || data.settlement,
      indigenousEmployeePercentage: data.indigenousEmployees,
      communityBenefitAgreements: data.hasCBA || false,
      traditionalTerritoryWork: data.traditionalTerritory ? true : false
    };
    
    // Add certifications if mentioned
    const certifications = [];
    if (data.ccabCertified || data.parCertified) {
      certifications.push({
        type: 'CCAB',
        issuer: 'Canadian Council for Aboriginal Business',
        status: 'active'
      });
    }
    
    return {
      ...business,
      confidence: 0.95, // Very high confidence for Indigenous org sources
      source: {
        ...business.source,
        type: SourceType.INDIGENOUS_ORG
      }
    } as DiscoveredBusiness;
  }
  
  /**
   * Parse directory-style business listing
   */
  private parseDirectoryBusiness($: cheerio.CheerioAPI, element: any, source: IndigenousOrgSource): DiscoveredBusiness {
    const $el = $(element);
    
    // Extract business information
    const name = $el.find('.business-name, .company-name, h3, h4').first().text().trim() ||
                 $el.find('a').first().text().trim();
    
    const website = $el.find('a[href*="http"]').attr('href') ||
                   $el.find('.website').attr('href');
    
    const description = $el.find('.description, .bio, .about').text().trim();
    
    const location = $el.find('.location, .address').text().trim();
    const [city, province] = location.split(',').map(s => s.trim());
    
    return this.parseIndigenousBusiness({
      name,
      website,
      description,
      city,
      province: province || source.region,
      email: $el.find('a[href^="mailto:"]').attr('href')?.replace('mailto:', ''),
      phone: $el.find('.phone, [href^="tel:"]').text().trim(),
      nation: $el.find('.nation, .tribe, .band').text().trim(),
      industry: $el.find('.category, .industry, .services').text().trim()
    }, source);
  }
  
  /**
   * Parse table row business
   */
  private parseTableRowBusiness(
    $: cheerio.CheerioAPI, 
    row: any, 
    headers: string[], 
    source: IndigenousOrgSource
  ): DiscoveredBusiness {
    const $row = $(row);
    const cells = $row.find('td').map((_, td) => $(td).text().trim()).get();
    
    const data: any = {};
    headers.forEach((header, index) => {
      if (cells[index]) {
        if (header.includes('name') || header.includes('business')) {
          data.name = cells[index];
        } else if (header.includes('location') || header.includes('city')) {
          data.city = cells[index];
        } else if (header.includes('contact')) {
          data.contact = cells[index];
        } else if (header.includes('industry') || header.includes('sector')) {
          data.industry = cells[index];
        }
      }
    });
    
    // Extract links
    const link = $row.find('a[href*="http"]').first();
    if (link.length) {
      data.website = link.attr('href');
      if (!data.name) {
        data.name = link.text().trim();
      }
    }
    
    return this.parseIndigenousBusiness(data, source);
  }
  
  /**
   * Parse list item business
   */
  private parseListItemBusiness($: cheerio.CheerioAPI, element: any, source: IndigenousOrgSource): DiscoveredBusiness {
    const $el = $(element);
    const text = $el.text();
    
    // Parse structured list items (e.g., "Business Name - Location - Industry")
    const parts = text.split(/[-–—|]/).map(s => s.trim());
    
    const data: any = {
      name: parts[0]
    };
    
    if (parts.length > 1) {
      // Try to identify location vs industry
      const locationKeywords = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      for (let i = 1; i < parts.length; i++) {
        if (locationKeywords.some(kw => parts[i].includes(kw))) {
          data.location = parts[i];
        } else {
          data.industry = parts[i];
        }
      }
    }
    
    // Check for links
    const link = $el.find('a').first();
    if (link.length) {
      data.website = link.attr('href');
    }
    
    return this.parseIndigenousBusiness(data, source);
  }
  
  /**
   * Parse card-style business listing
   */
  private parseCardBusiness($: cheerio.CheerioAPI, element: any, source: IndigenousOrgSource): DiscoveredBusiness {
    const $el = $(element);
    
    const data: any = {
      name: $el.find('[class*="name"], [class*="title"], h3, h4').first().text().trim(),
      description: $el.find('[class*="desc"], [class*="bio"], p').first().text().trim(),
      location: $el.find('[class*="location"], [class*="address"]').text().trim(),
      website: $el.find('a[href*="http"]').attr('href'),
      email: $el.find('a[href^="mailto:"]').attr('href')?.replace('mailto:', ''),
      phone: $el.find('[href^="tel:"], [class*="phone"]').text().trim(),
      industry: $el.find('[class*="category"], [class*="industry"]').text().trim()
    };
    
    return this.parseIndigenousBusiness(data, source);
  }
  
  /**
   * Parse industries from various formats
   */
  private parseIndustries(data: any): string[] {
    const industries: string[] = [];
    
    // Check various fields
    const fields = [
      data.industry,
      data.industries, 
      data.sector,
      data.sectors,
      data.services,
      data.categories,
      data.businessType
    ].filter(Boolean);
    
    fields.forEach(field => {
      if (Array.isArray(field)) {
        industries.push(...field);
      } else if (typeof field === 'string') {
        // Split by common delimiters
        industries.push(...field.split(/[,;|&]/).map(s => s.trim()).filter(Boolean));
      }
    });
    
    return [...new Set(industries)];
  }
}