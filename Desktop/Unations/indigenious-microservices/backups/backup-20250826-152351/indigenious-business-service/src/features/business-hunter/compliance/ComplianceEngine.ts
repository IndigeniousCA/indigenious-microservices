/**
 * Compliance & Legal Engine
 * Ensures all outreach complies with CASL, PIPEDA, OCAP, and provincial laws
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { createLogger } from '../core/utils/logger';
import {
  ComplianceCheck,
  ComplianceIssue,
  ComplianceType,
  OutreachTemplate,
  ChannelType,
  CampaignSchedule,
  DiscoveredBusiness,
  EnrichedBusiness
} from '../types/enhanced-types';

export interface ComplianceRules {
  casl: CASLRules;
  pipeda: PIPEDARules;
  ocap: OCAPRules;
  provincial: ProvincialRules;
  tos: TermsOfServiceRules;
}

export interface CASLRules {
  requiresConsent: boolean;
  impliedConsentDuration: number; // days
  expressConsentRequired: string[];
  exemptions: string[];
}

export interface PIPEDARules {
  requiresPrivacyPolicy: boolean;
  dataRetentionLimit: number; // days
  requiresDataMinimization: boolean;
  requiresAccessRequests: boolean;
}

export interface OCAPRules {
  respectsOwnership: boolean;
  respectsControl: boolean;
  respectsAccess: boolean;
  respectsPossession: boolean;
}

export interface ProvincialRules {
  quebec: QuebecPrivacyRules;
  bc: BCPrivacyRules;
  alberta: AlbertaPrivacyRules;
}

export interface QuebecPrivacyRules {
  law25Compliant: boolean;
  requiresBiometricConsent: boolean;
  requiresPrivacyOfficer: boolean;
}

export interface BCPrivacyRules {
  pipaCompliant: boolean;
  notificationRequired: boolean;
}

export interface AlbertaPrivacyRules {
  pipaCompliant: boolean;
  consentAge: number;
}

export interface TermsOfServiceRules {
  respectsRobotsTxt: boolean;
  respectsApiLimits: boolean;
  respectsUsageTerms: boolean;
}

export class ComplianceEngine extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly rules: ComplianceRules;
  private robotsTxtCache: Map<string, any>;

  constructor(redis: Redis) {
    super();
    this.logger = createLogger('compliance-engine');
    this.redis = redis;
    this.robotsTxtCache = new Map();

    // Initialize compliance rules
    this.rules = {
      casl: {
        requiresConsent: true,
        impliedConsentDuration: 730, // 2 years
        expressConsentRequired: ['email', 'sms', 'whatsapp'],
        exemptions: ['existing_relationship', 'inquiry_response', 'b2b_relevant']
      },
      pipeda: {
        requiresPrivacyPolicy: true,
        dataRetentionLimit: 1095, // 3 years
        requiresDataMinimization: true,
        requiresAccessRequests: true
      },
      ocap: {
        respectsOwnership: true,
        respectsControl: true,
        respectsAccess: true,
        respectsPossession: true
      },
      provincial: {
        quebec: {
          law25Compliant: true,
          requiresBiometricConsent: true,
          requiresPrivacyOfficer: true
        },
        bc: {
          pipaCompliant: true,
          notificationRequired: true
        },
        alberta: {
          pipaCompliant: true,
          consentAge: 18
        }
      },
      tos: {
        respectsRobotsTxt: true,
        respectsApiLimits: true,
        respectsUsageTerms: true
      }
    };
  }

  /**
   * Check campaign compliance
   */
  async checkCampaignCompliance(campaign: {
    targetBusinesses: any[];
    channels: ChannelType[];
    templates: OutreachTemplate[];
    schedule: CampaignSchedule;
  }): Promise<ComplianceCheck> {
    const issues: ComplianceIssue[] = [];
    const startTime = Date.now();

    this.logger.info('Checking campaign compliance', {
      targetCount: campaign.targetBusinesses.length,
      channels: campaign.channels
    });

    // Check CASL compliance
    const caslIssues = await this.checkCASLCompliance(campaign);
    issues.push(...caslIssues);

    // Check PIPEDA compliance
    const pipedaIssues = await this.checkPIPEDACompliance(campaign);
    issues.push(...pipedaIssues);

    // Check OCAP compliance (for Indigenous data)
    const ocapIssues = await this.checkOCAPCompliance(campaign);
    issues.push(...ocapIssues);

    // Check provincial compliance
    const provincialIssues = await this.checkProvincialCompliance(campaign);
    issues.push(...provincialIssues);

    // Check robots.txt compliance
    const robotsIssues = await this.checkRobotsTxtCompliance(campaign);
    issues.push(...robotsIssues);

    // Check TOS compliance
    const tosIssues = await this.checkTOSCompliance(campaign);
    issues.push(...tosIssues);

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const isCompliant = criticalIssues.length === 0;

    const complianceCheck: ComplianceCheck = {
      caslCompliant: !issues.some(i => i.type === ComplianceType.CASL && i.severity === 'critical'),
      pipedaCompliant: !issues.some(i => i.type === ComplianceType.PIPEDA && i.severity === 'critical'),
      ocapCompliant: !issues.some(i => i.type === ComplianceType.OCAP && i.severity === 'critical'),
      provincialCompliant: !issues.some(i => 
        [ComplianceType.QUEBEC_LAW_25, ComplianceType.BC_PIPA, ComplianceType.ALBERTA_PIPA]
          .includes(i.type) && i.severity === 'critical'
      ),
      robotsTxtRespected: !issues.some(i => i.type === ComplianceType.ROBOTS_TXT),
      tosCompliant: !issues.some(i => i.type === ComplianceType.TERMS_OF_SERVICE),
      compliant: isCompliant,
      issues,
      checkedAt: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    this.logger.info('Compliance check completed', {
      compliant: isCompliant,
      issueCount: issues.length,
      criticalCount: criticalIssues.length,
      duration: Date.now() - startTime
    });

    this.emit('compliance:checked', complianceCheck);

    return complianceCheck;
  }

  /**
   * Check CASL (Canadian Anti-Spam Law) compliance
   */
  private async checkCASLCompliance(campaign: any): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Check if we have consent for electronic channels
    const electronicChannels = campaign.channels.filter((c: ChannelType) => 
      this.rules.casl.expressConsentRequired.includes(c)
    );

    if (electronicChannels.length > 0) {
      // Check consent for each target
      for (const business of campaign.targetBusinesses.slice(0, 10)) { // Sample check
        const hasConsent = await this.checkConsent(business.id, electronicChannels);
        
        if (!hasConsent) {
          const hasExemption = await this.checkCASLExemption(business);
          
          if (!hasExemption) {
            issues.push({
              type: ComplianceType.CASL,
              severity: 'critical',
              message: `No consent found for electronic communications with ${business.name}`,
              field: 'consent',
              recommendation: 'Obtain express consent before sending commercial electronic messages'
            });
            break; // Only report once
          }
        }
      }
    }

    // Check unsubscribe mechanism
    for (const template of campaign.templates) {
      if (this.isElectronicChannel(template.channelType)) {
        if (!this.hasUnsubscribeOption(template.content)) {
          issues.push({
            type: ComplianceType.CASL,
            severity: 'critical',
            message: `Template for ${template.channelType} missing unsubscribe mechanism`,
            field: 'unsubscribe',
            recommendation: 'Add clear unsubscribe instructions to all electronic messages'
          });
        }

        if (!this.hasIdentificationInfo(template.content)) {
          issues.push({
            type: ComplianceType.CASL,
            severity: 'warning',
            message: `Template for ${template.channelType} missing sender identification`,
            field: 'identification',
            recommendation: 'Include complete sender identification (name, address, contact)'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check PIPEDA compliance
   */
  private async checkPIPEDACompliance(campaign: any): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Check privacy policy
    if (this.rules.pipeda.requiresPrivacyPolicy) {
      const hasPrivacyPolicy = await this.redis.exists('privacy:policy:current');
      
      if (!hasPrivacyPolicy) {
        issues.push({
          type: ComplianceType.PIPEDA,
          severity: 'critical',
          message: 'No privacy policy found',
          recommendation: 'Create and publish a comprehensive privacy policy'
        });
      }
    }

    // Check data minimization
    if (this.rules.pipeda.requiresDataMinimization) {
      // Check if we're collecting unnecessary data
      const dataFields = this.extractDataFields(campaign.templates);
      const unnecessaryFields = this.identifyUnnecessaryFields(dataFields);
      
      if (unnecessaryFields.length > 0) {
        issues.push({
          type: ComplianceType.PIPEDA,
          severity: 'warning',
          message: `Collecting potentially unnecessary data: ${unnecessaryFields.join(', ')}`,
          recommendation: 'Only collect data necessary for the stated purpose'
        });
      }
    }

    // Check data retention
    const oldDataCount = await this.checkOldData();
    if (oldDataCount > 0) {
      issues.push({
        type: ComplianceType.PIPEDA,
        severity: 'warning',
        message: `${oldDataCount} records exceed retention limit of ${this.rules.pipeda.dataRetentionLimit} days`,
        recommendation: 'Implement automatic data deletion for old records'
      });
    }

    return issues;
  }

  /**
   * Check OCAP compliance (Indigenous data sovereignty)
   */
  private async checkOCAPCompliance(campaign: any): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Check if targeting Indigenous businesses
    const indigenousTargets = campaign.targetBusinesses.filter((b: any) => 
      b.type === 'indigenous_owned' || b.indigenousDetails
    );

    if (indigenousTargets.length > 0) {
      // Ownership: Check if data is owned by Indigenous communities
      if (!this.rules.ocap.respectsOwnership) {
        issues.push({
          type: ComplianceType.OCAP,
          severity: 'critical',
          message: 'Indigenous data ownership not respected',
          recommendation: 'Ensure Indigenous communities own their data'
        });
      }

      // Control: Check if communities control data use
      const hasDataAgreement = await this.checkDataAgreements(indigenousTargets);
      if (!hasDataAgreement) {
        issues.push({
          type: ComplianceType.OCAP,
          severity: 'warning',
          message: 'No data sharing agreements found with Indigenous communities',
          recommendation: 'Establish formal data sharing agreements respecting community control'
        });
      }

      // Access: Check if communities can access their data
      if (!this.rules.ocap.respectsAccess) {
        issues.push({
          type: ComplianceType.OCAP,
          severity: 'warning',
          message: 'Indigenous communities may not have full access to their data',
          recommendation: 'Provide mechanisms for communities to access and export their data'
        });
      }

      // Possession: Check if data can be returned
      if (!this.rules.ocap.respectsPossession) {
        issues.push({
          type: ComplianceType.OCAP,
          severity: 'warning',
          message: 'No mechanism for returning data to Indigenous communities',
          recommendation: 'Implement data portability and return procedures'
        });
      }
    }

    return issues;
  }

  /**
   * Check provincial privacy law compliance
   */
  private async checkProvincialCompliance(campaign: any): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Group targets by province
    const targetsByProvince = this.groupByProvince(campaign.targetBusinesses);

    // Quebec Law 25
    if (targetsByProvince['QC']?.length > 0) {
      if (!this.rules.provincial.quebec.law25Compliant) {
        issues.push({
          type: ComplianceType.QUEBEC_LAW_25,
          severity: 'critical',
          message: 'Not compliant with Quebec Law 25 requirements',
          recommendation: 'Implement privacy impact assessments and biometric consent procedures'
        });
      }

      if (!await this.hasPrivacyOfficer()) {
        issues.push({
          type: ComplianceType.QUEBEC_LAW_25,
          severity: 'warning',
          message: 'No designated privacy officer for Quebec operations',
          recommendation: 'Appoint a privacy officer responsible for Quebec compliance'
        });
      }
    }

    // BC PIPA
    if (targetsByProvince['BC']?.length > 0) {
      if (!this.rules.provincial.bc.pipaCompliant) {
        issues.push({
          type: ComplianceType.BC_PIPA,
          severity: 'warning',
          message: 'May not be fully compliant with BC PIPA',
          recommendation: 'Review BC Personal Information Protection Act requirements'
        });
      }
    }

    // Alberta PIPA
    if (targetsByProvince['AB']?.length > 0) {
      if (!this.rules.provincial.alberta.pipaCompliant) {
        issues.push({
          type: ComplianceType.ALBERTA_PIPA,
          severity: 'warning',
          message: 'May not be fully compliant with Alberta PIPA',
          recommendation: 'Review Alberta Personal Information Protection Act requirements'
        });
      }
    }

    return issues;
  }

  /**
   * Check robots.txt compliance
   */
  private async checkRobotsTxtCompliance(campaign: any): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    if (!this.rules.tos.respectsRobotsTxt) {
      return issues;
    }

    // Check if we're scraping any websites
    const websitesToCheck = new Set<string>();
    
    for (const business of campaign.targetBusinesses) {
      if (business.website) {
        websitesToCheck.add(this.extractDomain(business.website));
      }
    }

    // Sample check on first 10 domains
    const domainsToCheck = Array.from(websitesToCheck).slice(0, 10);
    
    for (const domain of domainsToCheck) {
      const robotsTxt = await this.checkRobotsTxt(domain);
      
      if (robotsTxt?.disallowed) {
        issues.push({
          type: ComplianceType.ROBOTS_TXT,
          severity: 'warning',
          message: `Domain ${domain} disallows automated access via robots.txt`,
          recommendation: 'Respect robots.txt directives and avoid automated scraping'
        });
      }
    }

    return issues;
  }

  /**
   * Check Terms of Service compliance
   */
  private async checkTOSCompliance(campaign: any): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Check API rate limits
    const estimatedApiCalls = this.estimateApiCalls(campaign);
    
    if (estimatedApiCalls.email > 10000) {
      issues.push({
        type: ComplianceType.TERMS_OF_SERVICE,
        severity: 'warning',
        message: 'Campaign may exceed email API rate limits',
        recommendation: 'Implement rate limiting and spread sends over time'
      });
    }

    if (estimatedApiCalls.sms > 1000) {
      issues.push({
        type: ComplianceType.TERMS_OF_SERVICE,
        severity: 'warning',
        message: 'Campaign may exceed SMS API rate limits',
        recommendation: 'Review Twilio rate limits and implement queuing'
      });
    }

    // Check social media automation policies
    const socialChannels = campaign.channels.filter((c: ChannelType) => 
      [ChannelType.LINKEDIN, ChannelType.TWITTER, ChannelType.INSTAGRAM].includes(c)
    );

    if (socialChannels.length > 0) {
      issues.push({
        type: ComplianceType.TERMS_OF_SERVICE,
        severity: 'info',
        message: 'Social media platforms have strict automation policies',
        recommendation: 'Ensure compliance with each platform\'s automation guidelines'
      });
    }

    return issues;
  }

  /**
   * Check consent status
   */
  async checkConsent(businessId: string, channels: ChannelType[]): Promise<boolean> {
    for (const channel of channels) {
      const consentKey = `consent:${businessId}:${channel}`;
      const consent = await this.redis.get(consentKey);
      
      if (!consent) {
        return false;
      }
      
      // Check if consent is still valid
      const consentData = JSON.parse(consent);
      if (consentData.expiresAt && new Date(consentData.expiresAt) < new Date()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Record consent
   */
  async recordConsent(
    businessId: string,
    channel: ChannelType,
    type: 'express' | 'implied',
    source: string
  ): Promise<void> {
    const consentData = {
      businessId,
      channel,
      type,
      source,
      grantedAt: new Date(),
      expiresAt: type === 'implied' 
        ? new Date(Date.now() + this.rules.casl.impliedConsentDuration * 24 * 60 * 60 * 1000)
        : null
    };

    const key = `consent:${businessId}:${channel}`;
    await this.redis.setex(
      key,
      86400 * 365 * 10, // 10 years
      JSON.stringify(consentData)
    );

    this.emit('consent:recorded', consentData);
  }

  /**
   * Check CASL exemptions
   */
  private async checkCASLExemption(business: any): Promise<boolean> {
    // B2B exemption - relevant to business
    if (business.type === 'canadian_general' || business.type === 'potential_partner') {
      return true; // B2B communications about relevant products/services
    }

    // Existing business relationship
    const hasRelationship = await this.redis.exists(`relationship:${business.id}`);
    if (hasRelationship) {
      return true;
    }

    // Response to inquiry
    const hasInquiry = await this.redis.exists(`inquiry:${business.id}`);
    if (hasInquiry) {
      return true;
    }

    return false;
  }

  /**
   * Helper methods
   */
  private isElectronicChannel(channel: ChannelType): boolean {
    return [
      ChannelType.EMAIL,
      ChannelType.SMS,
      ChannelType.WHATSAPP,
      ChannelType.LINKEDIN,
      ChannelType.TWITTER,
      ChannelType.INSTAGRAM,
      ChannelType.TIKTOK,
      ChannelType.REDDIT,
      ChannelType.YOUTUBE,
      ChannelType.FACEBOOK
    ].includes(channel);
  }

  private hasUnsubscribeOption(content: string): boolean {
    const unsubscribeKeywords = [
      'unsubscribe',
      'opt out',
      'opt-out',
      'stop receiving',
      'remove me',
      'désinscription',
      'désabonner'
    ];
    
    const lowerContent = content.toLowerCase();
    return unsubscribeKeywords.some(keyword => lowerContent.includes(keyword));
  }

  private hasIdentificationInfo(content: string): boolean {
    // Check for basic identification elements
    const identifiers = [
      'indigenous business network',
      'business.ca',
      '@indigenousbusiness.ca',
      'toronto', // address
      'canada'
    ];
    
    const lowerContent = content.toLowerCase();
    return identifiers.filter(id => lowerContent.includes(id)).length >= 2;
  }

  private extractDataFields(templates: OutreachTemplate[]): string[] {
    const fields = new Set<string>();
    
    for (const template of templates) {
      // Extract personalization tokens
      const tokens = template.personalizationTokens || [];
      tokens.forEach(token => fields.add(token));
      
      // Extract from content
      const matches = template.content.match(/\{([^}]+)\}/g) || [];
      matches.forEach(match => {
        const field = match.replace(/[{}]/g, '');
        fields.add(field);
      });
    }
    
    return Array.from(fields);
  }

  private identifyUnnecessaryFields(fields: string[]): string[] {
    const necessary = [
      'businessName', 'contactName', 'firstName', 'lastName',
      'email', 'phone', 'title', 'industry', 'location'
    ];
    
    return fields.filter(field => !necessary.includes(field));
  }

  private async checkOldData(): Promise<number> {
    // This would check database for records older than retention limit
    // For now, return 0
    return 0;
  }

  private async checkDataAgreements(indigenousTargets: any[]): Promise<boolean> {
    // Check if we have data sharing agreements
    for (const target of indigenousTargets) {
      if (target.indigenousDetails?.nation) {
        const agreementKey = `data-agreement:${target.indigenousDetails.nation}`;
        const hasAgreement = await this.redis.exists(agreementKey);
        if (!hasAgreement) {
          return false;
        }
      }
    }
    return true;
  }

  private groupByProvince(businesses: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const business of businesses) {
      const province = business.address?.province;
      if (province) {
        if (!grouped[province]) {
          grouped[province] = [];
        }
        grouped[province].push(business);
      }
    }
    
    return grouped;
  }

  private async hasPrivacyOfficer(): Promise<boolean> {
    return await this.redis.exists('privacy:officer:appointed');
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname;
    } catch {
      return '';
    }
  }

  private async checkRobotsTxt(domain: string): Promise<any> {
    if (this.robotsTxtCache.has(domain)) {
      return this.robotsTxtCache.get(domain);
    }

    try {
      // This would fetch and parse robots.txt
      // For now, return null
      return null;
    } catch (error) {
      this.logger.debug(`Failed to check robots.txt for ${domain}:`, error);
      return null;
    }
  }

  private estimateApiCalls(campaign: any): Record<string, number> {
    const estimates: Record<string, number> = {
      email: 0,
      sms: 0,
      social: 0
    };

    const targetCount = campaign.targetBusinesses.length;
    
    for (const channel of campaign.channels) {
      switch (channel) {
        case ChannelType.EMAIL:
          estimates.email += targetCount * 1.5; // Including follow-ups
          break;
        case ChannelType.SMS:
        case ChannelType.WHATSAPP:
          estimates.sms += targetCount * 1.2;
          break;
        default:
          estimates.social += targetCount;
      }
    }

    return estimates;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const report = {
      period: { start: startDate, end: endDate },
      campaigns: {
        total: 0,
        compliant: 0,
        nonCompliant: 0,
        issues: [] as any[]
      },
      consent: {
        obtained: 0,
        expired: 0,
        optOuts: 0
      },
      dataProtection: {
        accessRequests: 0,
        deletionRequests: 0,
        breaches: 0
      },
      recommendations: [] as string[]
    };

    // Generate report data
    // This would aggregate compliance data from Redis/database

    return report;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.robotsTxtCache.clear();
  }
}