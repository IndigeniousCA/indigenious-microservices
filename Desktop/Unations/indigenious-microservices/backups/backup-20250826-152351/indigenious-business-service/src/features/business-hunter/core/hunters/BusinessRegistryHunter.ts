import { BaseHunter } from './BaseHunter';
import { DiscoveredBusiness } from '../../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface RegistryBusiness {
  registrationNumber: string;
  businessName: string;
  legalName: string;
  status: 'active' | 'inactive' | 'dissolved';
  registrationDate: Date;
  lastUpdated: Date;
  jurisdiction: string;
  businessType: string;
  naicsCode?: string;
  directors?: Array<{
    name: string;
    position: string;
    appointmentDate: Date;
  }>;
  registeredAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  mailingAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
}

export class BusinessRegistryHunter extends BaseHunter {
  private readonly registries = {
    federal: {
      name: 'Corporations Canada',
      url: 'https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/',
      searchEndpoint: '/search'
    },
    ON: {
      name: 'Ontario Business Registry',
      url: 'https://www.ontario.ca/page/business-registry',
      searchEndpoint: '/search'
    },
    BC: {
      name: 'BC Registry Services',
      url: 'https://www.bcregistry.ca/',
      searchEndpoint: '/search'
    },
    AB: {
      name: 'Alberta Corporate Registry',
      url: 'https://www.alberta.ca/alberta-corporate-registry.aspx',
      searchEndpoint: '/search'
    },
    QC: {
      name: 'Registraire des entreprises du Québec',
      url: 'https://www.registreentreprises.gouv.qc.ca/',
      searchEndpoint: '/search'
    },
    MB: {
      name: 'Manitoba Companies Office',
      url: 'https://companiesoffice.gov.mb.ca/',
      searchEndpoint: '/search'
    },
    SK: {
      name: 'Saskatchewan Corporate Registry',
      url: 'https://www.isc.ca/CorporateRegistry/',
      searchEndpoint: '/search'
    },
    NS: {
      name: 'Nova Scotia Registry of Joint Stock Companies',
      url: 'https://beta.novascotia.ca/programs-and-services/registry-joint-stock-companies',
      searchEndpoint: '/search'
    },
    NB: {
      name: 'Service New Brunswick Corporate Registry',
      url: 'https://www2.snb.ca/content/snb/en/sites/corporate-registry.html',
      searchEndpoint: '/search'
    },
    NL: {
      name: 'Newfoundland and Labrador Registry of Companies',
      url: 'https://www.gov.nl.ca/dgsnl/companies/',
      searchEndpoint: '/search'
    },
    PE: {
      name: 'PEI Corporate/Business Names Registry',
      url: 'https://www.princeedwardisland.ca/en/feature/pei-business-corporate-registry-original',
      searchEndpoint: '/search'
    },
    NT: {
      name: 'Northwest Territories Corporate Registry',
      url: 'https://www.justice.gov.nt.ca/en/divisions/legal-registries-division/corporate-registry/',
      searchEndpoint: '/search'
    },
    YT: {
      name: 'Yukon Corporate Affairs',
      url: 'https://yukon.ca/en/doing-business/licensing-and-permits/find-business-yukon',
      searchEndpoint: '/search'
    },
    NU: {
      name: 'Nunavut Business Registry',
      url: 'https://gov.nu.ca/edt/documents/starting-business-nunavut',
      searchEndpoint: '/search'
    }
  };

  private readonly indigenousIdentifiers = [
    'indigenous', 'first nations', 'métis', 'inuit', 'aboriginal',
    'native', 'band council', 'tribal council', 'nation', 'treaty'
  ];

  constructor() {
    super({
      name: 'BusinessRegistryHunter',
      type: 'registry',
      config: {
        rateLimit: 10, // Very conservative rate limit for government sites
        timeout: 30000, // Longer timeout for slow government servers
        retryAttempts: 3,
        retryDelay: 5000
      }
    });
  }

  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    const registry = this.registries[source] || this.registries.federal;
    
    try {
      const searchTerms = options?.searchTerms || this.indigenousIdentifiers;
      const businesses: DiscoveredBusiness[] = [];

      for (const term of searchTerms) {
        const results = await this.searchRegistry(registry, term, options);
        const discovered = await this.processRegistryResults(results, source);
        businesses.push(...discovered);
      }

      // Deduplicate by registration number
      const uniqueBusinesses = this.deduplicateBusinesses(businesses);
      
      logger.info(`BusinessRegistryHunter found ${uniqueBusinesses.length} businesses in ${registry.name}`);
      return uniqueBusinesses;
    } catch (error) {
      logger.error(`BusinessRegistryHunter error with ${registry.name}:`, error);
      throw error;
    }
  }

  private async searchRegistry(registry: any, searchTerm: string, options?: any): Promise<RegistryBusiness[]> {
    await this.rateLimiter.check();

    // In production, this would make actual API calls to government registries
    // For now, we'll simulate the search
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockResults: RegistryBusiness[] = [];
    const numResults = Math.floor(Math.random() * 20) + 5;

    for (let i = 0; i < numResults; i++) {
      const hasIndigenousIdentifier = Math.random() > 0.3;
      
      mockResults.push({
        registrationNumber: this.generateRegistrationNumber(registry),
        businessName: this.generateBusinessName(hasIndigenousIdentifier),
        legalName: this.generateLegalName(hasIndigenousIdentifier),
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        registrationDate: new Date(Date.now() - Math.random() * 10 * 365 * 24 * 60 * 60 * 1000),
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        jurisdiction: options?.jurisdiction || 'federal',
        businessType: this.generateBusinessType(),
        naicsCode: this.generateNAICSCode(),
        directors: this.generateDirectors(),
        registeredAddress: this.generateAddress(),
        mailingAddress: Math.random() > 0.5 ? this.generateAddress() : undefined
      });
    }

    return mockResults;
  }

  private async processRegistryResults(results: RegistryBusiness[], source: string): Promise<DiscoveredBusiness[]> {
    const businesses: DiscoveredBusiness[] = [];

    for (const result of results) {
      if (result.status !== 'active') continue;

      const isIndigenous = this.checkIndigenousIndicators(result);
      const business = this.createBusinessFromRegistry(result, source, isIndigenous);
      
      businesses.push(business);
    }

    return businesses;
  }

  private checkIndigenousIndicators(business: RegistryBusiness): boolean {
    const checkString = `${business.businessName} ${business.legalName}`.toLowerCase();
    
    return this.indigenousIdentifiers.some(identifier => 
      checkString.includes(identifier)
    ) || business.businessName.includes('Band') || 
    business.businessName.includes('Nation') ||
    business.businessName.includes('Tribal');
  }

  private createBusinessFromRegistry(registry: RegistryBusiness, source: string, isIndigenous: boolean): DiscoveredBusiness {
    const industry = this.determineIndustryFromNAICS(registry.naicsCode);
    
    return {
      id: crypto.randomBytes(16).toString('hex'),
      name: registry.businessName,
      legalName: registry.legalName,
      description: `${registry.businessType} registered in ${source}`,
      registrationNumber: registry.registrationNumber,
      industry: industry ? [industry] : [],
      indigenousIdentifiers: isIndigenous ? {
        selfIdentified: true,
        communityAffiliation: this.extractCommunityFromName(registry.businessName),
        certifications: []
      } : undefined,
      contact: {
        address: `${registry.registeredAddress.street}, ${registry.registeredAddress.city}, ${registry.registeredAddress.province} ${registry.registeredAddress.postalCode}`
      },
      location: {
        address: registry.registeredAddress.street,
        city: registry.registeredAddress.city,
        province: registry.registeredAddress.province,
        postalCode: registry.registeredAddress.postalCode,
        country: registry.registeredAddress.country
      },
      businessDetails: {
        yearEstablished: registry.registrationDate.getFullYear(),
        businessType: registry.businessType,
        naicsCode: registry.naicsCode,
        jurisdiction: source
      },
      governance: {
        directors: registry.directors?.map(d => ({
          name: d.name,
          position: d.position,
          startDate: d.appointmentDate
        }))
      },
      metadata: {
        source: `business_registry_${source}`,
        sourceId: registry.registrationNumber,
        discoveredAt: new Date(),
        confidence: 0.95, // High confidence from official registry
        lastUpdated: registry.lastUpdated,
        verificationStatus: 'pending'
      }
    };
  }

  private determineIndustryFromNAICS(naicsCode?: string): string | null {
    if (!naicsCode) return null;

    const naicsMap: Record<string, string> = {
      '11': 'agriculture',
      '21': 'mining',
      '22': 'utilities',
      '23': 'construction',
      '31': 'manufacturing',
      '32': 'manufacturing',
      '33': 'manufacturing',
      '41': 'wholesale',
      '44': 'retail',
      '45': 'retail',
      '48': 'transportation',
      '49': 'transportation',
      '51': 'information',
      '52': 'finance',
      '53': 'real estate',
      '54': 'professional services',
      '55': 'management',
      '56': 'administrative',
      '61': 'education',
      '62': 'healthcare',
      '71': 'arts',
      '72': 'hospitality',
      '81': 'other services',
      '91': 'public administration'
    };

    const prefix = naicsCode.substring(0, 2);
    return naicsMap[prefix] || null;
  }

  private extractCommunityFromName(businessName: string): string | undefined {
    const communities = [
      'Cree', 'Ojibwe', 'Mi\'kmaq', 'Mohawk', 'Inuit', 'Métis',
      'Blackfoot', 'Cherokee', 'Haida', 'Dene', 'Innu', 'Salish'
    ];

    for (const community of communities) {
      if (businessName.includes(community)) {
        return community;
      }
    }

    if (businessName.includes('First Nation')) {
      const match = businessName.match(/(\w+)\s+First Nation/);
      if (match) return `${match[1]} First Nation`;
    }

    return undefined;
  }

  private deduplicateBusinesses(businesses: DiscoveredBusiness[]): DiscoveredBusiness[] {
    const seen = new Map<string, DiscoveredBusiness>();
    
    for (const business of businesses) {
      const key = business.registrationNumber || business.name;
      if (!seen.has(key)) {
        seen.set(key, business);
      }
    }

    return Array.from(seen.values());
  }

  private generateRegistrationNumber(registry: any): string {
    const prefix = registry.name.substring(0, 2).toUpperCase();
    const number = Math.floor(Math.random() * 9999999) + 1000000;
    return `${prefix}${number}`;
  }

  private generateBusinessName(hasIndigenous: boolean): string {
    const indigenousPrefixes = [
      'Eagle Feather', 'Spirit Bear', 'Northern Lights', 'Seven Generations',
      'Sacred Circle', 'Medicine Wheel', 'Thunder Bird', 'Wolf Pack'
    ];
    
    const regularPrefixes = [
      'Northern', 'Canadian', 'Maple', 'Great Lakes', 'Prairie', 'Mountain'
    ];
    
    const suffixes = [
      'Enterprises Ltd.', 'Solutions Inc.', 'Services Corp.', 'Holdings Ltd.',
      'Consulting Inc.', 'Industries Corp.', 'Group Ltd.', 'Ventures Inc.'
    ];

    const prefix = hasIndigenous 
      ? indigenousPrefixes[Math.floor(Math.random() * indigenousPrefixes.length)]
      : regularPrefixes[Math.floor(Math.random() * regularPrefixes.length)];
      
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${suffix}`;
  }

  private generateLegalName(hasIndigenous: boolean): string {
    const name = this.generateBusinessName(hasIndigenous);
    return name.replace(' Ltd.', ' Limited').replace(' Inc.', ' Incorporated').replace(' Corp.', ' Corporation');
  }

  private generateBusinessType(): string {
    const types = [
      'Corporation', 'Limited Partnership', 'Sole Proprietorship',
      'Non-Profit Corporation', 'Cooperative', 'Limited Liability Company'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private generateNAICSCode(): string {
    const codes = ['236110', '541611', '541330', '238210', '541511', '541512', '722511', '811111'];
    return codes[Math.floor(Math.random() * codes.length)];
  }

  private generateDirectors(): Array<any> {
    const numDirectors = Math.floor(Math.random() * 3) + 1;
    const directors = [];
    
    const firstNames = ['John', 'Mary', 'Robert', 'Patricia', 'Michael', 'Jennifer', 'David', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const positions = ['President', 'Director', 'Secretary', 'Treasurer', 'Vice President'];

    for (let i = 0; i < numDirectors; i++) {
      directors.push({
        name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        position: positions[i % positions.length],
        appointmentDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)
      });
    }

    return directors;
  }

  private generateAddress(): any {
    const streets = ['Main St', 'First Ave', 'Elm St', 'Oak Ave', 'Maple Rd', 'King St', 'Queen St'];
    const cities = ['Toronto', 'Vancouver', 'Calgary', 'Winnipeg', 'Ottawa', 'Montreal', 'Halifax', 'Saskatoon'];
    const provinces = ['ON', 'BC', 'AB', 'MB', 'ON', 'QC', 'NS', 'SK'];
    
    const index = Math.floor(Math.random() * cities.length);
    
    return {
      street: `${Math.floor(Math.random() * 9999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`,
      city: cities[index],
      province: provinces[index],
      postalCode: this.generatePostalCode(provinces[index]),
      country: 'Canada'
    };
  }

  private generatePostalCode(province: string): string {
    const firstLetters = {
      'ON': ['K', 'L', 'M', 'N', 'P'],
      'BC': ['V'],
      'AB': ['T'],
      'MB': ['R'],
      'QC': ['G', 'H', 'J'],
      'NS': ['B'],
      'SK': ['S']
    };
    
    const letters = firstLetters[province] || ['X'];
    const firstLetter = letters[Math.floor(Math.random() * letters.length)];
    const randomLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    return `${firstLetter}${Math.floor(Math.random() * 10)}${randomLetters[Math.floor(Math.random() * 26)]} ${Math.floor(Math.random() * 10)}${randomLetters[Math.floor(Math.random() * 26)]}${Math.floor(Math.random() * 10)}`;
  }
}