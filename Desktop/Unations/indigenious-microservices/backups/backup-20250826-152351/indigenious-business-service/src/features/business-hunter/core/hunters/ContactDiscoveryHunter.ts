/**
 * Contact Discovery Hunter
 * Discovers and enriches contact information for businesses
 * CRITICAL: Without contacts, discovered businesses are useless!
 */

import { BaseHunter } from './BaseHunter';
import { Redis } from 'ioredis';
import axios from 'axios';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { 
  DiscoveredBusiness, 
  HunterConfig,
  EnrichedBusiness 
} from '../../types';
import {
  ContactDiscoveryResult,
  DiscoveredContact,
  ContactType,
  EmailDeliverability,
  ContactVerificationStatus
} from '../../types/enhanced-types';

export class ContactDiscoveryHunter extends BaseHunter {
  // Email pattern templates
  private readonly emailPatterns = [
    '{firstname}.{lastname}@{domain}',
    '{firstname}{lastname}@{domain}',
    '{f}{lastname}@{domain}',
    '{firstname}@{domain}',
    '{lastname}@{domain}',
    '{firstname}_{lastname}@{domain}',
    '{firstname}-{lastname}@{domain}',
    '{lastname}.{firstname}@{domain}',
    '{f}.{lastname}@{domain}',
    '{firstname}.{l}@{domain}',
    'info@{domain}',
    'contact@{domain}',
    'hello@{domain}',
    'admin@{domain}',
    'sales@{domain}',
    'support@{domain}',
    'inquiries@{domain}',
    'general@{domain}'
  ];

  // Decision maker titles
  private readonly decisionMakerTitles = [
    'CEO', 'Chief Executive', 'President', 'Owner', 'Founder',
    'COO', 'Chief Operating', 'CFO', 'Chief Financial',
    'CTO', 'Chief Technology', 'VP', 'Vice President',
    'Director', 'Managing Director', 'General Manager',
    'Head of', 'Partner', 'Principal'
  ];

  // Third-party service clients
  private hunterIoApiKey?: string;
  private clearbitApiKey?: string;
  private twilioAccountSid?: string;
  private twilioAuthToken?: string;

  constructor(config: HunterConfig, redis: Redis) {
    super(config, redis);
    
    // Initialize third-party services
    this.hunterIoApiKey = process.env.HUNTER_IO_API_KEY;
    this.clearbitApiKey = process.env.CLEARBIT_API_KEY;
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  }

  /**
   * Hunt for contacts - not businesses, but contact info for existing businesses
   */
  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    // This hunter doesn't discover new businesses, it enriches existing ones
    throw new Error('ContactDiscoveryHunter enriches contacts, use huntContacts() instead');
  }

  /**
   * Discover contacts for a business
   */
  async huntContacts(business: DiscoveredBusiness | EnrichedBusiness): Promise<ContactDiscoveryResult> {
    const startTime = Date.now();
    const contacts: DiscoveredContact[] = [];
    const sources: string[] = [];

    this.logger.info(`Discovering contacts for business: ${business.name}`, {
      businessId: business.id,
      website: business.website
    });

    try {
      // Strategy 1: Website scraping for emails and phones
      if (business.website) {
        const websiteContacts = await this.scrapeWebsiteContacts(business);
        contacts.push(...websiteContacts);
        if (websiteContacts.length > 0) sources.push('website');
      }

      // Strategy 2: Email pattern generation and verification
      if (business.website) {
        const generatedEmails = await this.generateAndVerifyEmails(business);
        contacts.push(...generatedEmails);
        if (generatedEmails.length > 0) sources.push('email_patterns');
      }

      // Strategy 3: Hunter.io API
      if (this.hunterIoApiKey && business.website) {
        const hunterContacts = await this.searchHunterIo(business);
        contacts.push(...hunterContacts);
        if (hunterContacts.length > 0) sources.push('hunter.io');
      }

      // Strategy 4: Clearbit API
      if (this.clearbitApiKey && business.website) {
        const clearbitContacts = await this.searchClearbit(business);
        contacts.push(...clearbitContacts);
        if (clearbitContacts.length > 0) sources.push('clearbit');
      }

      // Strategy 5: Social media profile extraction
      const socialContacts = await this.extractSocialContacts(business);
      contacts.push(...socialContacts);
      if (socialContacts.length > 0) sources.push('social_media');

      // Strategy 6: Business registries and directories
      const registryContacts = await this.searchBusinessRegistries(business);
      contacts.push(...registryContacts);
      if (registryContacts.length > 0) sources.push('registries');

      // Deduplicate and merge contacts
      const uniqueContacts = this.deduplicateContacts(contacts);

      // Verify all contacts
      const verifiedContacts = await this.verifyContacts(uniqueContacts);

      // Calculate verification status
      const verificationStatus = this.calculateVerificationStatus(verifiedContacts);

      const result: ContactDiscoveryResult = {
        businessId: business.id,
        contacts: verifiedContacts,
        confidence: this.calculateOverallConfidence(verifiedContacts),
        discoveredAt: new Date(),
        sources,
        verificationStatus
      };

      this.logger.info(`Contact discovery completed for ${business.name}`, {
        businessId: business.id,
        contactsFound: verifiedContacts.length,
        duration: Date.now() - startTime,
        sources
      });

      return result;

    } catch (error) {
      this.logger.error(`Contact discovery failed for ${business.name}:`, error);
      throw error;
    }
  }

  /**
   * Scrape website for contact information
   */
  private async scrapeWebsiteContacts(business: DiscoveredBusiness): Promise<DiscoveredContact[]> {
    if (!business.website) return [];

    const contacts: DiscoveredContact[] = [];

    try {
      // Fetch common contact pages
      const contactPages = [
        business.website,
        `${business.website}/contact`,
        `${business.website}/contact-us`,
        `${business.website}/about`,
        `${business.website}/about-us`,
        `${business.website}/team`,
        `${business.website}/leadership`
      ];

      for (const url of contactPages) {
        try {
          const response = await this.httpClient.get(url);
          const html = response.data;

          // Extract emails
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const emails = html.match(emailRegex) || [];

          // Extract phone numbers
          const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}/g;
          const phones = html.match(phoneRegex) || [];

          // Extract names and titles (basic implementation)
          const namePatterns = [
            /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi,
            /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi,
            /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/gi
          ];

          for (const email of emails) {
            if (this.isValidBusinessEmail(email, business.website)) {
              contacts.push({
                id: this.generateContactId(business.id, email),
                businessId: business.id,
                type: this.inferContactType(email),
                fullName: this.inferNameFromEmail(email),
                email: email.toLowerCase(),
                isDecisionMaker: false,
                isPrimary: this.isPrimaryEmail(email),
                confidence: 0.7,
                discoveredFrom: ['website_scrape']
              });
            }
          }

          for (const phone of phones) {
            const cleanPhone = this.cleanPhone(phone);
            if (cleanPhone && isValidPhoneNumber(cleanPhone, 'CA')) {
              const existingContact = contacts.find(c => !c.phone);
              if (existingContact) {
                existingContact.phone = cleanPhone;
              } else {
                contacts.push({
                  id: this.generateContactId(business.id, cleanPhone),
                  businessId: business.id,
                  type: ContactType.GENERAL,
                  fullName: 'Unknown',
                  phone: cleanPhone,
                  isDecisionMaker: false,
                  isPrimary: false,
                  confidence: 0.5,
                  discoveredFrom: ['website_scrape']
                });
              }
            }
          }

        } catch (error) {
          // Continue with other pages
          this.logger.debug(`Failed to scrape ${url}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Website scraping failed:', error);
    }

    return contacts;
  }

  /**
   * Generate and verify email patterns
   */
  private async generateAndVerifyEmails(business: DiscoveredBusiness): Promise<DiscoveredContact[]> {
    if (!business.website) return [];

    const contacts: DiscoveredContact[] = [];
    const domain = this.extractDomain(business.website);

    // Try to find owner/executive names from various sources
    const potentialNames = await this.findExecutiveNames(business);

    for (const name of potentialNames) {
      for (const pattern of this.emailPatterns) {
        const email = this.generateEmailFromPattern(pattern, name, domain);
        
        if (email && this.isValidBusinessEmail(email, business.website)) {
          // Quick validation check
          const isValid = await this.quickEmailValidation(email);
          
          if (isValid) {
            contacts.push({
              id: this.generateContactId(business.id, email),
              businessId: business.id,
              type: ContactType.EXECUTIVE,
              firstName: name.firstName,
              lastName: name.lastName,
              fullName: `${name.firstName} ${name.lastName}`,
              title: name.title,
              email: email.toLowerCase(),
              isDecisionMaker: this.isDecisionMakerTitle(name.title || ''),
              isPrimary: true,
              confidence: 0.6,
              discoveredFrom: ['email_pattern']
            });
          }
        }
      }
    }

    // Also try generic patterns
    for (const pattern of this.emailPatterns.filter(p => !p.includes('{firstname}'))) {
      const email = this.generateEmailFromPattern(pattern, null, domain);
      
      if (email && this.isValidBusinessEmail(email, business.website)) {
        const isValid = await this.quickEmailValidation(email);
        
        if (isValid) {
          contacts.push({
            id: this.generateContactId(business.id, email),
            businessId: business.id,
            type: ContactType.GENERAL,
            fullName: 'General Inquiry',
            email: email.toLowerCase(),
            isDecisionMaker: false,
            isPrimary: false,
            confidence: 0.4,
            discoveredFrom: ['email_pattern']
          });
        }
      }
    }

    return contacts;
  }

  /**
   * Search Hunter.io for contacts
   */
  private async searchHunterIo(business: DiscoveredBusiness): Promise<DiscoveredContact[]> {
    if (!this.hunterIoApiKey || !business.website) return [];

    const contacts: DiscoveredContact[] = [];
    const domain = this.extractDomain(business.website);

    try {
      // Domain search
      const domainResponse = await axios.get(
        `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${this.hunterIoApiKey}`
      );

      if (domainResponse.data?.data?.emails) {
        for (const emailData of domainResponse.data.data.emails) {
          contacts.push({
            id: this.generateContactId(business.id, emailData.value),
            businessId: business.id,
            type: this.inferContactTypeFromTitle(emailData.position),
            firstName: emailData.first_name,
            lastName: emailData.last_name,
            fullName: `${emailData.first_name || ''} ${emailData.last_name || ''}`.trim() || 'Unknown',
            title: emailData.position,
            department: emailData.department,
            email: emailData.value.toLowerCase(),
            emailVerified: emailData.confidence > 80,
            linkedin: emailData.linkedin,
            twitter: emailData.twitter,
            isDecisionMaker: this.isDecisionMakerTitle(emailData.position || ''),
            isPrimary: emailData.type === 'personal',
            confidence: emailData.confidence / 100,
            discoveredFrom: ['hunter.io']
          });
        }
      }

      // Email finder for specific names
      if (business.contacts && business.contacts.length > 0) {
        for (const existingContact of business.contacts) {
          if (existingContact.name && !existingContact.email) {
            const [firstName, ...lastNameParts] = existingContact.name.split(' ');
            const lastName = lastNameParts.join(' ');

            const finderResponse = await axios.get(
              `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${this.hunterIoApiKey}`
            );

            if (finderResponse.data?.data?.email) {
              const emailData = finderResponse.data.data;
              contacts.push({
                id: this.generateContactId(business.id, emailData.email),
                businessId: business.id,
                type: this.inferContactTypeFromTitle(emailData.position),
                firstName: emailData.first_name,
                lastName: emailData.last_name,
                fullName: existingContact.name,
                title: emailData.position,
                email: emailData.email.toLowerCase(),
                emailVerified: emailData.confidence > 80,
                isDecisionMaker: this.isDecisionMakerTitle(emailData.position || ''),
                isPrimary: true,
                confidence: emailData.confidence / 100,
                discoveredFrom: ['hunter.io']
              });
            }
          }
        }
      }

    } catch (error) {
      this.logger.error('Hunter.io search failed:', error);
    }

    return contacts;
  }

  /**
   * Search Clearbit for contacts
   */
  private async searchClearbit(business: DiscoveredBusiness): Promise<DiscoveredContact[]> {
    if (!this.clearbitApiKey || !business.website) return [];

    const contacts: DiscoveredContact[] = [];
    const domain = this.extractDomain(business.website);

    try {
      // Company lookup
      const response = await axios.get(
        `https://company.clearbit.com/v2/companies/find?domain=${domain}`,
        { headers: { Authorization: `Bearer ${this.clearbitApiKey}` } }
      );

      if (response.data) {
        const company = response.data;

        // Add main contact if available
        if (company.emailProvider !== false) {
          // Try to find people associated with the company
          const peopleResponse = await axios.get(
            `https://person.clearbit.com/v2/people/search?company_domain=${domain}`,
            { headers: { Authorization: `Bearer ${this.clearbitApiKey}` } }
          );

          if (peopleResponse.data?.results) {
            for (const person of peopleResponse.data.results) {
              contacts.push({
                id: this.generateContactId(business.id, person.email),
                businessId: business.id,
                type: this.inferContactTypeFromTitle(person.title),
                firstName: person.name?.givenName,
                lastName: person.name?.familyName,
                fullName: person.name?.fullName || 'Unknown',
                title: person.title,
                email: person.email.toLowerCase(),
                emailVerified: true,
                linkedin: person.linkedin?.handle,
                twitter: person.twitter?.handle,
                isDecisionMaker: this.isDecisionMakerTitle(person.title || ''),
                isPrimary: person.seniority === 'executive',
                confidence: 0.9,
                discoveredFrom: ['clearbit']
              });
            }
          }
        }
      }

    } catch (error) {
      this.logger.error('Clearbit search failed:', error);
    }

    return contacts;
  }

  /**
   * Extract contacts from social media profiles
   */
  private async extractSocialContacts(business: DiscoveredBusiness): Promise<DiscoveredContact[]> {
    const contacts: DiscoveredContact[] = [];

    // This would integrate with social media APIs
    // For now, we'll check if the business has social profiles
    if ((business as any).socialProfiles) {
      for (const profile of (business as any).socialProfiles) {
        if (profile.platform === 'linkedin' && profile.url) {
          // LinkedIn company page might have contact info
          // This would require LinkedIn API access
          this.logger.debug('Found LinkedIn profile:', profile.url);
        }
      }
    }

    return contacts;
  }

  /**
   * Search business registries for contact information
   */
  private async searchBusinessRegistries(business: DiscoveredBusiness): Promise<DiscoveredContact[]> {
    const contacts: DiscoveredContact[] = [];

    // This would integrate with government business registries
    // Many registries list directors and registered addresses
    if (business.businessNumber) {
      this.logger.debug('Searching registries for business number:', business.businessNumber);
    }

    return contacts;
  }

  /**
   * Verify contacts using various methods
   */
  private async verifyContacts(contacts: DiscoveredContact[]): Promise<DiscoveredContact[]> {
    const verifiedContacts: DiscoveredContact[] = [];

    for (const contact of contacts) {
      let verified = { ...contact };

      // Verify email
      if (contact.email) {
        const emailDeliverability = await this.verifyEmail(contact.email);
        verified.emailVerified = emailDeliverability.deliverable;
        verified.emailDeliverability = emailDeliverability;
        
        // Adjust confidence based on verification
        if (emailDeliverability.deliverable) {
          verified.confidence = Math.min(verified.confidence * 1.2, 1.0);
        } else {
          verified.confidence = verified.confidence * 0.5;
        }
      }

      // Verify phone
      if (contact.phone) {
        const phoneVerification = await this.verifyPhone(contact.phone);
        verified.phoneVerified = phoneVerification.valid;
        verified.phoneType = phoneVerification.type;
      }

      verifiedContacts.push(verified);
    }

    return verifiedContacts;
  }

  /**
   * Verify email deliverability
   */
  private async verifyEmail(email: string): Promise<EmailDeliverability> {
    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        deliverable: false,
        acceptAll: false,
        disposable: false,
        role: false,
        free: false,
        score: 0
      };
    }

    // Check if it's a role-based email
    const roleEmails = ['info', 'admin', 'contact', 'hello', 'support', 'sales'];
    const localPart = email.split('@')[0].toLowerCase();
    const isRole = roleEmails.includes(localPart);

    // Check if it's a free email provider
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = email.split('@')[1].toLowerCase();
    const isFree = freeProviders.includes(domain);

    // Check if it's a disposable email
    const disposableProviders = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    const isDisposable = disposableProviders.includes(domain);

    // If we have Hunter.io API key, use it for verification
    if (this.hunterIoApiKey) {
      try {
        const response = await axios.get(
          `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${this.hunterIoApiKey}`
        );
        
        if (response.data?.data) {
          const data = response.data.data;
          return {
            deliverable: data.result === 'deliverable',
            acceptAll: data.accept_all || false,
            disposable: data.disposable || false,
            role: isRole,
            free: isFree,
            score: data.score || 0,
            smtpCheck: data.smtp_check,
            mxRecords: data.mx_records,
            provider: data.webmail ? 'webmail' : 'corporate'
          };
        }
      } catch (error) {
        this.logger.debug('Hunter.io verification failed:', error);
      }
    }

    // Basic scoring without API
    let score = 1.0;
    if (isRole) score -= 0.2;
    if (isFree) score -= 0.3;
    if (isDisposable) score = 0;

    return {
      deliverable: score > 0.5,
      acceptAll: false,
      disposable: isDisposable,
      role: isRole,
      free: isFree,
      score
    };
  }

  /**
   * Verify phone number
   */
  private async verifyPhone(phone: string): Promise<{ valid: boolean; type?: 'mobile' | 'landline' | 'voip' }> {
    try {
      const phoneNumber = parsePhoneNumber(phone, 'CA');
      
      if (!phoneNumber || !phoneNumber.isValid()) {
        return { valid: false };
      }

      // If we have Twilio credentials, do a lookup
      if (this.twilioAccountSid && this.twilioAuthToken) {
        try {
          const response = await axios.get(
            `https://lookups.twilio.com/v1/PhoneNumbers/${phoneNumber.number}?Type=carrier`,
            {
              auth: {
                username: this.twilioAccountSid,
                password: this.twilioAuthToken
              }
            }
          );

          if (response.data) {
            return {
              valid: true,
              type: response.data.carrier?.type || 'landline'
            };
          }
        } catch (error) {
          this.logger.debug('Twilio lookup failed:', error);
        }
      }

      return { valid: true };

    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Deduplicate contacts
   */
  private deduplicateContacts(contacts: DiscoveredContact[]): DiscoveredContact[] {
    const uniqueContacts = new Map<string, DiscoveredContact>();

    for (const contact of contacts) {
      const key = `${contact.email || ''}_${contact.phone || ''}`.toLowerCase();
      
      if (!uniqueContacts.has(key)) {
        uniqueContacts.set(key, contact);
      } else {
        // Merge contact information
        const existing = uniqueContacts.get(key)!;
        uniqueContacts.set(key, this.mergeContacts(existing, contact));
      }
    }

    return Array.from(uniqueContacts.values());
  }

  /**
   * Merge two contact records
   */
  private mergeContacts(contact1: DiscoveredContact, contact2: DiscoveredContact): DiscoveredContact {
    return {
      ...contact1,
      ...contact2,
      id: contact1.id,
      businessId: contact1.businessId,
      firstName: contact1.firstName || contact2.firstName,
      lastName: contact1.lastName || contact2.lastName,
      fullName: contact1.fullName !== 'Unknown' ? contact1.fullName : contact2.fullName,
      title: contact1.title || contact2.title,
      department: contact1.department || contact2.department,
      email: contact1.email || contact2.email,
      phone: contact1.phone || contact2.phone,
      linkedin: contact1.linkedin || contact2.linkedin,
      twitter: contact1.twitter || contact2.twitter,
      isDecisionMaker: contact1.isDecisionMaker || contact2.isDecisionMaker,
      isPrimary: contact1.isPrimary || contact2.isPrimary,
      confidence: Math.max(contact1.confidence, contact2.confidence),
      discoveredFrom: [...new Set([...contact1.discoveredFrom, ...contact2.discoveredFrom])]
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(contacts: DiscoveredContact[]): number {
    if (contacts.length === 0) return 0;

    const avgConfidence = contacts.reduce((sum, c) => sum + c.confidence, 0) / contacts.length;
    const hasDecisionMaker = contacts.some(c => c.isDecisionMaker);
    const hasVerifiedEmail = contacts.some(c => c.emailVerified);
    const hasPhone = contacts.some(c => c.phone);

    let score = avgConfidence;
    if (hasDecisionMaker) score += 0.2;
    if (hasVerifiedEmail) score += 0.1;
    if (hasPhone) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate verification status
   */
  private calculateVerificationStatus(contacts: DiscoveredContact[]): ContactVerificationStatus {
    const emailsVerified = contacts.filter(c => c.email && c.emailVerified).length;
    const phonesVerified = contacts.filter(c => c.phone && c.phoneVerified).length;
    const totalContacts = contacts.length;

    return {
      emailsVerified,
      phonesVerified,
      totalContacts,
      verificationRate: totalContacts > 0 ? (emailsVerified + phonesVerified) / (totalContacts * 2) : 0,
      lastVerified: new Date()
    };
  }

  /**
   * Helper methods
   */
  private extractDomain(website: string): string {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      return url.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private generateContactId(businessId: string, identifier: string): string {
    return `${businessId}_${this.generateHash(identifier)}`;
  }

  private generateHash(input: string): string {
    return require('crypto').createHash('md5').update(input).digest('hex').substring(0, 8);
  }

  private isValidBusinessEmail(email: string, website: string): boolean {
    const domain = this.extractDomain(website);
    const emailDomain = email.split('@')[1];
    return emailDomain === domain || !email.includes('example.com');
  }

  private inferContactType(email: string): ContactType {
    const localPart = email.split('@')[0].toLowerCase();
    
    if (localPart.includes('ceo') || localPart.includes('president')) return ContactType.EXECUTIVE;
    if (localPart.includes('owner') || localPart.includes('founder')) return ContactType.OWNER;
    if (localPart.includes('manager')) return ContactType.MANAGER;
    if (localPart.includes('sales')) return ContactType.SALES;
    if (localPart.includes('procurement')) return ContactType.PROCUREMENT;
    
    return ContactType.GENERAL;
  }

  private inferContactTypeFromTitle(title?: string): ContactType {
    if (!title) return ContactType.GENERAL;
    
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('ceo') || lowerTitle.includes('chief executive')) return ContactType.EXECUTIVE;
    if (lowerTitle.includes('owner') || lowerTitle.includes('founder')) return ContactType.OWNER;
    if (lowerTitle.includes('manager')) return ContactType.MANAGER;
    if (lowerTitle.includes('sales')) return ContactType.SALES;
    if (lowerTitle.includes('procurement')) return ContactType.PROCUREMENT;
    
    return ContactType.GENERAL;
  }

  private isDecisionMakerTitle(title: string): boolean {
    const lowerTitle = title.toLowerCase();
    return this.decisionMakerTitles.some(t => lowerTitle.includes(t.toLowerCase()));
  }

  private isPrimaryEmail(email: string): boolean {
    const genericPrefixes = ['info', 'contact', 'hello', 'admin', 'support', 'sales'];
    const localPart = email.split('@')[0].toLowerCase();
    return !genericPrefixes.includes(localPart);
  }

  private inferNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    
    // Try to extract name from email patterns
    if (localPart.includes('.')) {
      const parts = localPart.split('.');
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    
    if (localPart.includes('_')) {
      const parts = localPart.split('_');
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    
    return 'Unknown';
  }

  private generateEmailFromPattern(
    pattern: string, 
    name: { firstName: string; lastName: string } | null, 
    domain: string
  ): string | null {
    if (!name && pattern.includes('{firstname}')) return null;
    
    let email = pattern.replace('{domain}', domain);
    
    if (name) {
      email = email
        .replace('{firstname}', name.firstName.toLowerCase())
        .replace('{lastname}', name.lastName.toLowerCase())
        .replace('{f}', name.firstName.charAt(0).toLowerCase())
        .replace('{l}', name.lastName.charAt(0).toLowerCase());
    }
    
    return email;
  }

  private async quickEmailValidation(email: string): Promise<boolean> {
    // Quick DNS check for MX records
    try {
      const domain = email.split('@')[1];
      const dns = require('dns').promises;
      const mxRecords = await dns.resolveMx(domain);
      return mxRecords && mxRecords.length > 0;
    } catch {
      return false;
    }
  }

  private async findExecutiveNames(business: DiscoveredBusiness): Promise<Array<{
    firstName: string;
    lastName: string;
    title?: string;
  }>> {
    const names: Array<{ firstName: string; lastName: string; title?: string }> = [];
    
    // This would integrate with various sources to find executive names
    // For now, return empty array
    return names;
  }
}