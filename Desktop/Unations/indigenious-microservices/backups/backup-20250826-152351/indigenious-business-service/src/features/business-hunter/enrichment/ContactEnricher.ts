/**
 * Contact Enricher Service
 * Enriches and validates contact information from multiple sources
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import axios from 'axios';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { createLogger } from '../core/utils/logger';
import { ContactDiscoveryHunter } from '../core/hunters/ContactDiscoveryHunter';
import {
  DiscoveredBusiness,
  EnrichedBusiness,
  Contact
} from '../types';
import {
  ContactDiscoveryResult,
  DiscoveredContact,
  EmailDeliverability
} from '../types/enhanced-types';

export interface ContactEnrichmentOptions {
  verifyEmails: boolean;
  verifyPhones: boolean;
  findSocialProfiles: boolean;
  enrichFromAPIs: boolean;
  maxContactsPerBusiness: number;
  prioritizeDecisionMakers: boolean;
}

export class ContactEnricher extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly contactHunter: ContactDiscoveryHunter;
  private readonly options: ContactEnrichmentOptions;

  // Service configurations
  private readonly services = {
    hunterIo: {
      apiKey: process.env.HUNTER_IO_API_KEY,
      rateLimit: 50, // per minute
      endpoint: 'https://api.hunter.io/v2'
    },
    clearbit: {
      apiKey: process.env.CLEARBIT_API_KEY,
      rateLimit: 600, // per minute
      endpoint: 'https://person.clearbit.com/v2'
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      rateLimit: 30, // per second
      endpoint: 'https://lookups.twilio.com/v1'
    },
    emailVerifier: {
      apiKey: process.env.EMAIL_VERIFIER_API_KEY,
      endpoint: 'https://api.email-verifier.com/v1'
    }
  };

  constructor(redis: Redis, options?: Partial<ContactEnrichmentOptions>) {
    super();
    this.logger = createLogger('contact-enricher');
    this.redis = redis;
    
    // Default options
    this.options = {
      verifyEmails: true,
      verifyPhones: true,
      findSocialProfiles: true,
      enrichFromAPIs: true,
      maxContactsPerBusiness: 10,
      prioritizeDecisionMakers: true,
      ...options
    };

    // Initialize contact hunter
    const hunterConfig = {
      id: 'contact-enricher',
      type: 'contact' as any,
      sources: [],
      rateLimit: 60,
      priority: 1,
      enabled: true
    };
    this.contactHunter = new ContactDiscoveryHunter(hunterConfig, redis);
  }

  /**
   * Enrich business with contact information
   */
  async enrichBusinessWithContacts(business: DiscoveredBusiness | EnrichedBusiness): Promise<EnrichedBusiness> {
    const startTime = Date.now();
    
    this.logger.info(`Starting contact enrichment for business: ${business.name}`, {
      businessId: business.id,
      existingContacts: (business as EnrichedBusiness).contacts?.length || 0
    });

    try {
      // Check cache first
      const cacheKey = `contacts:${business.id}`;
      const cachedContacts = await this.redis.get(cacheKey);
      
      if (cachedContacts && !this.isDataStale(cachedContacts)) {
        this.logger.debug(`Using cached contacts for ${business.name}`);
        const contacts = JSON.parse(cachedContacts);
        return this.mergeContactsIntoBusiness(business, contacts);
      }

      // Discover new contacts
      const discoveryResult = await this.contactHunter.huntContacts(business);

      // Enrich discovered contacts
      const enrichedContacts = await this.enrichContacts(discoveryResult.contacts, business);

      // Merge with existing contacts
      const existingContacts = (business as EnrichedBusiness).contacts || [];
      const mergedContacts = this.mergeAndDeduplicateContacts(existingContacts, enrichedContacts);

      // Prioritize and limit contacts
      const finalContacts = this.prioritizeContacts(mergedContacts);

      // Cache the results
      await this.redis.setex(cacheKey, 86400, JSON.stringify(finalContacts)); // 24 hours

      const enrichedBusiness = this.mergeContactsIntoBusiness(business, finalContacts);

      this.logger.info(`Contact enrichment completed for ${business.name}`, {
        businessId: business.id,
        contactsFound: finalContacts.length,
        decisionMakers: finalContacts.filter(c => c.isDecisionMaker).length,
        verifiedEmails: finalContacts.filter(c => c.emailVerified).length,
        duration: Date.now() - startTime
      });

      this.emit('enrichment:complete', {
        businessId: business.id,
        contactsAdded: finalContacts.length,
        duration: Date.now() - startTime
      });

      return enrichedBusiness;

    } catch (error) {
      this.logger.error(`Contact enrichment failed for ${business.name}:`, error);
      this.emit('enrichment:error', {
        businessId: business.id,
        error: error.message
      });
      
      // Return business without enrichment
      return business as EnrichedBusiness;
    }
  }

  /**
   * Batch enrich multiple businesses
   */
  async enrichBusinessesWithContacts(
    businesses: (DiscoveredBusiness | EnrichedBusiness)[]
  ): Promise<EnrichedBusiness[]> {
    const enrichedBusinesses: EnrichedBusiness[] = [];
    const batchSize = 10;

    // Process in batches to avoid overwhelming APIs
    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(business => this.enrichBusinessWithContacts(business))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          enrichedBusinesses.push(result.value);
        } else {
          this.logger.error('Batch enrichment failed:', result.reason);
        }
      }

      // Rate limiting between batches
      if (i + batchSize < businesses.length) {
        await this.sleep(2000); // 2 seconds between batches
      }
    }

    return enrichedBusinesses;
  }

  /**
   * Enrich individual contacts with additional data
   */
  private async enrichContacts(
    contacts: DiscoveredContact[], 
    business: DiscoveredBusiness
  ): Promise<DiscoveredContact[]> {
    const enrichedContacts: DiscoveredContact[] = [];

    for (const contact of contacts) {
      let enrichedContact = { ...contact };

      try {
        // Email enrichment and verification
        if (contact.email && this.options.verifyEmails) {
          enrichedContact = await this.enrichEmail(enrichedContact);
        }

        // Phone enrichment and verification
        if (contact.phone && this.options.verifyPhones) {
          enrichedContact = await this.enrichPhone(enrichedContact);
        }

        // Social profile enrichment
        if (this.options.findSocialProfiles) {
          enrichedContact = await this.enrichSocialProfiles(enrichedContact, business);
        }

        // API-based enrichment (Clearbit, etc.)
        if (this.options.enrichFromAPIs && contact.email) {
          enrichedContact = await this.enrichFromAPIs(enrichedContact);
        }

        enrichedContacts.push(enrichedContact);

      } catch (error) {
        this.logger.error(`Failed to enrich contact ${contact.email || contact.phone}:`, error);
        enrichedContacts.push(contact); // Keep original if enrichment fails
      }
    }

    return enrichedContacts;
  }

  /**
   * Enrich email with verification and additional data
   */
  private async enrichEmail(contact: DiscoveredContact): Promise<DiscoveredContact> {
    if (!contact.email) return contact;

    try {
      // Hunter.io email verification
      if (this.services.hunterIo.apiKey) {
        const verificationData = await this.verifyEmailWithHunter(contact.email);
        
        contact.emailVerified = verificationData.deliverable;
        contact.emailDeliverability = verificationData;
        
        // Adjust confidence based on verification
        if (verificationData.deliverable) {
          contact.confidence = Math.min(contact.confidence * 1.2, 1.0);
        } else if (!verificationData.deliverable) {
          contact.confidence = contact.confidence * 0.5;
        }
      }

      // Alternative email verification service
      else if (this.services.emailVerifier.apiKey) {
        const verificationData = await this.verifyEmailWithAlternative(contact.email);
        contact.emailVerified = verificationData.deliverable;
        contact.emailDeliverability = verificationData;
      }

    } catch (error) {
      this.logger.debug(`Email verification failed for ${contact.email}:`, error);
    }

    return contact;
  }

  /**
   * Enrich phone with verification and carrier lookup
   */
  private async enrichPhone(contact: DiscoveredContact): Promise<DiscoveredContact> {
    if (!contact.phone) return contact;

    try {
      // Twilio phone lookup
      if (this.services.twilio.accountSid && this.services.twilio.authToken) {
        const phoneData = await this.verifyPhoneWithTwilio(contact.phone);
        
        contact.phoneVerified = phoneData.valid;
        contact.phoneType = phoneData.type;
        
        // Format phone number properly
        if (phoneData.formattedNumber) {
          contact.phone = phoneData.formattedNumber;
        }
      }
      
      // Basic validation if no API available
      else {
        const phoneNumber = parsePhoneNumber(contact.phone, 'CA');
        contact.phoneVerified = phoneNumber?.isValid() || false;
      }

    } catch (error) {
      this.logger.debug(`Phone verification failed for ${contact.phone}:`, error);
    }

    return contact;
  }

  /**
   * Enrich with social media profiles
   */
  private async enrichSocialProfiles(
    contact: DiscoveredContact, 
    business: DiscoveredBusiness
  ): Promise<DiscoveredContact> {
    try {
      // LinkedIn search
      if (contact.fullName && contact.fullName !== 'Unknown') {
        const linkedinUrl = await this.findLinkedInProfile(contact.fullName, business.name);
        if (linkedinUrl) {
          contact.linkedin = linkedinUrl;
        }
      }

      // Twitter search (if email available)
      if (contact.email) {
        const twitterHandle = await this.findTwitterHandle(contact.email);
        if (twitterHandle) {
          contact.twitter = twitterHandle;
        }
      }

    } catch (error) {
      this.logger.debug('Social profile enrichment failed:', error);
    }

    return contact;
  }

  /**
   * Enrich using third-party APIs
   */
  private async enrichFromAPIs(contact: DiscoveredContact): Promise<DiscoveredContact> {
    if (!contact.email) return contact;

    try {
      // Clearbit enrichment
      if (this.services.clearbit.apiKey) {
        const clearbitData = await this.enrichWithClearbit(contact.email);
        
        if (clearbitData) {
          // Merge Clearbit data
          contact.firstName = contact.firstName || clearbitData.firstName;
          contact.lastName = contact.lastName || clearbitData.lastName;
          contact.fullName = contact.fullName === 'Unknown' ? clearbitData.fullName : contact.fullName;
          contact.title = contact.title || clearbitData.title;
          contact.linkedin = contact.linkedin || clearbitData.linkedin;
          contact.twitter = contact.twitter || clearbitData.twitter;
          
          // Update decision maker status
          if (clearbitData.seniority === 'executive' || clearbitData.seniority === 'director') {
            contact.isDecisionMaker = true;
          }
        }
      }

    } catch (error) {
      this.logger.debug('API enrichment failed:', error);
    }

    return contact;
  }

  /**
   * Verify email with Hunter.io
   */
  private async verifyEmailWithHunter(email: string): Promise<EmailDeliverability> {
    try {
      const response = await axios.get(
        `${this.services.hunterIo.endpoint}/email-verifier`,
        {
          params: {
            email,
            api_key: this.services.hunterIo.apiKey
          }
        }
      );

      const data = response.data?.data;
      
      return {
        deliverable: data?.result === 'deliverable',
        acceptAll: data?.accept_all || false,
        disposable: data?.disposable || false,
        role: data?.role || false,
        free: data?.free || false,
        score: data?.score || 0,
        smtpCheck: data?.smtp_check,
        mxRecords: data?.mx_records,
        provider: data?.sources?.length > 0 ? 'verified' : 'unverified'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify email with alternative service
   */
  private async verifyEmailWithAlternative(email: string): Promise<EmailDeliverability> {
    // Implementation for alternative email verification service
    // This is a placeholder - would integrate with actual service
    return {
      deliverable: true,
      acceptAll: false,
      disposable: false,
      role: false,
      free: false,
      score: 0.8
    };
  }

  /**
   * Verify phone with Twilio
   */
  private async verifyPhoneWithTwilio(phone: string): Promise<{
    valid: boolean;
    type?: 'mobile' | 'landline' | 'voip';
    formattedNumber?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.services.twilio.endpoint}/PhoneNumbers/${phone}`,
        {
          params: { Type: 'carrier' },
          auth: {
            username: this.services.twilio.accountSid!,
            password: this.services.twilio.authToken!
          }
        }
      );

      return {
        valid: true,
        type: response.data?.carrier?.type || 'landline',
        formattedNumber: response.data?.phone_number
      };

    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Find LinkedIn profile
   */
  private async findLinkedInProfile(fullName: string, companyName: string): Promise<string | null> {
    // This would integrate with LinkedIn API or search
    // For now, return null
    return null;
  }

  /**
   * Find Twitter handle
   */
  private async findTwitterHandle(email: string): Promise<string | null> {
    // This would integrate with Twitter API
    // For now, return null
    return null;
  }

  /**
   * Enrich with Clearbit
   */
  private async enrichWithClearbit(email: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.services.clearbit.endpoint}/people/find`,
        {
          params: { email },
          headers: { Authorization: `Bearer ${this.services.clearbit.apiKey}` }
        }
      );

      return {
        firstName: response.data?.name?.givenName,
        lastName: response.data?.name?.familyName,
        fullName: response.data?.name?.fullName,
        title: response.data?.employment?.title,
        seniority: response.data?.employment?.seniority,
        linkedin: response.data?.linkedin?.handle,
        twitter: response.data?.twitter?.handle
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Merge and deduplicate contacts
   */
  private mergeAndDeduplicateContacts(
    existing: Contact[],
    discovered: DiscoveredContact[]
  ): DiscoveredContact[] {
    const contactMap = new Map<string, DiscoveredContact>();

    // Convert existing contacts to DiscoveredContact format
    for (const contact of existing) {
      const key = this.getContactKey(contact);
      contactMap.set(key, this.convertToDiscoveredContact(contact));
    }

    // Add/merge discovered contacts
    for (const contact of discovered) {
      const key = this.getContactKey(contact);
      
      if (contactMap.has(key)) {
        // Merge with existing
        const existing = contactMap.get(key)!;
        contactMap.set(key, this.mergeContacts(existing, contact));
      } else {
        contactMap.set(key, contact);
      }
    }

    return Array.from(contactMap.values());
  }

  /**
   * Get unique key for contact
   */
  private getContactKey(contact: any): string {
    if (contact.email) return `email:${contact.email.toLowerCase()}`;
    if (contact.phone) return `phone:${contact.phone}`;
    return `name:${contact.fullName || contact.name}`;
  }

  /**
   * Convert Contact to DiscoveredContact
   */
  private convertToDiscoveredContact(contact: Contact): DiscoveredContact {
    return {
      id: `existing_${this.generateHash(contact.email || contact.phone || contact.name)}`,
      businessId: '',
      type: contact.title?.toLowerCase().includes('executive') ? 'executive' : 'general',
      fullName: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      isDecisionMaker: contact.isPrimary,
      isPrimary: contact.isPrimary,
      confidence: 1.0,
      discoveredFrom: ['existing']
    } as DiscoveredContact;
  }

  /**
   * Merge two contacts
   */
  private mergeContacts(existing: DiscoveredContact, discovered: DiscoveredContact): DiscoveredContact {
    return {
      ...existing,
      ...discovered,
      id: existing.id,
      // Prefer verified/enriched data
      email: discovered.emailVerified ? discovered.email : (existing.email || discovered.email),
      phone: discovered.phoneVerified ? discovered.phone : (existing.phone || discovered.phone),
      emailVerified: existing.emailVerified || discovered.emailVerified,
      phoneVerified: existing.phoneVerified || discovered.phoneVerified,
      // Merge social profiles
      linkedin: existing.linkedin || discovered.linkedin,
      twitter: existing.twitter || discovered.twitter,
      // Keep highest confidence
      confidence: Math.max(existing.confidence, discovered.confidence),
      // Merge discovery sources
      discoveredFrom: [...new Set([...existing.discoveredFrom, ...discovered.discoveredFrom])]
    };
  }

  /**
   * Prioritize contacts based on configuration
   */
  private prioritizeContacts(contacts: DiscoveredContact[]): DiscoveredContact[] {
    // Sort by priority
    const sorted = contacts.sort((a, b) => {
      // Decision makers first
      if (this.options.prioritizeDecisionMakers) {
        if (a.isDecisionMaker && !b.isDecisionMaker) return -1;
        if (!a.isDecisionMaker && b.isDecisionMaker) return 1;
      }

      // Then by verification status
      const aVerified = (a.emailVerified ? 1 : 0) + (a.phoneVerified ? 1 : 0);
      const bVerified = (b.emailVerified ? 1 : 0) + (b.phoneVerified ? 1 : 0);
      if (aVerified !== bVerified) return bVerified - aVerified;

      // Then by confidence
      return b.confidence - a.confidence;
    });

    // Limit to max contacts
    return sorted.slice(0, this.options.maxContactsPerBusiness);
  }

  /**
   * Merge contacts into business object
   */
  private mergeContactsIntoBusiness(
    business: DiscoveredBusiness | EnrichedBusiness,
    contacts: DiscoveredContact[]
  ): EnrichedBusiness {
    const enrichedBusiness = business as EnrichedBusiness;

    // Convert DiscoveredContact to Contact format
    const businessContacts: Contact[] = contacts.map(dc => ({
      name: dc.fullName,
      title: dc.title,
      email: dc.email,
      phone: dc.phone,
      linkedin: dc.linkedin,
      isPrimary: dc.isPrimary,
      department: dc.department
    }));

    return {
      ...enrichedBusiness,
      contacts: businessContacts,
      enrichedAt: new Date()
    };
  }

  /**
   * Check if cached data is stale
   */
  private isDataStale(cachedData: string): boolean {
    try {
      const data = JSON.parse(cachedData);
      const cacheTime = new Date(data.cachedAt || 0).getTime();
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      return now - cacheTime > maxAge;
    } catch {
      return true;
    }
  }

  /**
   * Helper methods
   */
  private generateHash(input: string): string {
    return require('crypto').createHash('md5').update(input).digest('hex').substring(0, 8);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    await this.contactHunter.cleanup();
  }
}