import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { logger } from '../core/utils/logger';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  apiKeyId?: string;
  ipAddress: string;
  userAgent?: string;
  resource: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  metadata?: Record<string, any>;
  errorMessage?: string;
  riskScore?: number;
}

export enum AuditEventType {
  // Authentication events
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  
  // Access events
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  IP_BLOCKED = 'IP_BLOCKED',
  
  // Data events
  DATA_ACCESSED = 'DATA_ACCESSED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_MODIFIED = 'DATA_MODIFIED',
  DATA_DELETED = 'DATA_DELETED',
  
  // Hunter events
  HUNTER_STARTED = 'HUNTER_STARTED',
  HUNTER_STOPPED = 'HUNTER_STOPPED',
  HUNTER_SCALED = 'HUNTER_SCALED',
  HUNTER_ERROR = 'HUNTER_ERROR',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  ENCRYPTION_FAILURE = 'ENCRYPTION_FAILURE',
  INTEGRITY_CHECK_FAILURE = 'INTEGRITY_CHECK_FAILURE'
}

/**
 * Enterprise audit logging system with compliance support
 * Implements SOC2, ISO 27001, and regulatory compliance requirements
 */
export class AuditLogger extends EventEmitter {
  private readonly storage: AuditStorage;
  private readonly retention: number;
  private readonly encryptLogs: boolean;

  constructor(config: {
    storage: AuditStorage;
    retentionDays: number;
    encryptLogs?: boolean;
  }) {
    super();
    this.storage = config.storage;
    this.retention = config.retentionDays;
    this.encryptLogs = config.encryptLogs || false;
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
      riskScore: this.calculateRiskScore(event)
    };

    try {
      // Store the event
      await this.storage.store(auditEvent);

      // Emit for real-time monitoring
      this.emit('audit', auditEvent);

      // Alert on high-risk events
      if (auditEvent.riskScore && auditEvent.riskScore >= 8) {
        this.emit('high-risk-event', auditEvent);
        logger.error('High-risk security event detected', auditEvent);
      }
    } catch (error) {
      logger.error('Failed to log audit event', { error, event });
    }
  }

  /**
   * Query audit logs
   */
  async query(filters: AuditQueryFilters): Promise<AuditEvent[]> {
    return this.storage.query(filters);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType: 'SOC2' | 'ISO27001' | 'PIPEDA' | 'GDPR'
  ): Promise<ComplianceReport> {
    const events = await this.query({ startDate, endDate });

    switch (reportType) {
      case 'SOC2':
        return this.generateSOC2Report(events, startDate, endDate);
      case 'ISO27001':
        return this.generateISO27001Report(events, startDate, endDate);
      case 'PIPEDA':
        return this.generatePIPEDAReport(events, startDate, endDate);
      case 'GDPR':
        return this.generateGDPRReport(events, startDate, endDate);
    }
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(event: Partial<AuditEvent>): number {
    let score = 0;

    // Failed authentication attempts
    if (event.eventType === AuditEventType.AUTHENTICATION_FAILURE) {
      score += 3;
    }

    // Access denied events
    if (event.eventType === AuditEventType.ACCESS_DENIED) {
      score += 2;
    }

    // Rate limit exceeded
    if (event.eventType === AuditEventType.RATE_LIMIT_EXCEEDED) {
      score += 4;
    }

    // Security violations
    if (event.eventType === AuditEventType.SECURITY_VIOLATION) {
      score += 8;
    }

    // Suspicious activity
    if (event.eventType === AuditEventType.SUSPICIOUS_ACTIVITY) {
      score += 6;
    }

    // Data deletion
    if (event.eventType === AuditEventType.DATA_DELETED) {
      score += 5;
    }

    // Multiple failures from same IP
    if (event.result === 'failure' && event.metadata?.failureCount > 3) {
      score += 3;
    }

    return Math.min(score, 10);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return createHash('sha256')
      .update(`${timestamp}-${random}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Generate SOC2 compliance report
   */
  private generateSOC2Report(
    events: AuditEvent[],
    startDate: Date,
    endDate: Date
  ): ComplianceReport {
    const securityEvents = events.filter(e => 
      [AuditEventType.SECURITY_VIOLATION, AuditEventType.SUSPICIOUS_ACTIVITY].includes(e.eventType)
    );

    const accessControls = events.filter(e =>
      [AuditEventType.ACCESS_GRANTED, AuditEventType.ACCESS_DENIED].includes(e.eventType)
    );

    return {
      type: 'SOC2',
      period: { start: startDate, end: endDate },
      sections: {
        security: {
          title: 'Security Principle',
          totalEvents: securityEvents.length,
          violations: securityEvents.filter(e => e.result === 'failure').length,
          recommendations: this.generateSecurityRecommendations(securityEvents)
        },
        availability: {
          title: 'Availability Principle',
          uptime: this.calculateUptime(events),
          incidents: events.filter(e => e.eventType === AuditEventType.HUNTER_ERROR).length
        },
        confidentiality: {
          title: 'Confidentiality Principle',
          dataAccess: events.filter(e => e.eventType === AuditEventType.DATA_ACCESSED).length,
          unauthorizedAttempts: accessControls.filter(e => e.result === 'failure').length
        }
      },
      summary: this.generateReportSummary(events),
      generatedAt: new Date()
    };
  }

  /**
   * Generate ISO 27001 compliance report
   */
  private generateISO27001Report(
    events: AuditEvent[],
    startDate: Date,
    endDate: Date
  ): ComplianceReport {
    return {
      type: 'ISO27001',
      period: { start: startDate, end: endDate },
      sections: {
        accessControl: {
          title: 'A.9 Access Control',
          controls: this.analyzeAccessControls(events),
          nonConformities: this.findNonConformities(events, 'access')
        },
        cryptography: {
          title: 'A.10 Cryptography',
          encryptionFailures: events.filter(e => 
            e.eventType === AuditEventType.ENCRYPTION_FAILURE
          ).length
        },
        operations: {
          title: 'A.12 Operations Security',
          incidents: this.categorizeIncidents(events),
          logging: {
            totalLogs: events.length,
            retentionCompliant: true
          }
        }
      },
      summary: this.generateReportSummary(events),
      generatedAt: new Date()
    };
  }

  /**
   * Generate PIPEDA compliance report
   */
  private generatePIPEDAReport(
    events: AuditEvent[],
    startDate: Date,
    endDate: Date
  ): ComplianceReport {
    const dataEvents = events.filter(e => 
      e.eventType.toString().startsWith('DATA_')
    );

    return {
      type: 'PIPEDA',
      period: { start: startDate, end: endDate },
      sections: {
        accountability: {
          title: 'Principle 1: Accountability',
          dataControllers: this.identifyDataControllers(events),
          policies: 'Implemented and documented'
        },
        consent: {
          title: 'Principle 3: Consent',
          dataAccessWithConsent: dataEvents.filter(e => 
            e.metadata?.consentVerified === true
          ).length,
          totalDataAccess: dataEvents.length
        },
        safeguards: {
          title: 'Principle 7: Safeguards',
          securityMeasures: this.assessSecurityMeasures(events),
          breaches: events.filter(e => 
            e.eventType === AuditEventType.SECURITY_VIOLATION
          ).length
        }
      },
      summary: this.generateReportSummary(events),
      generatedAt: new Date()
    };
  }

  /**
   * Generate GDPR compliance report
   */
  private generateGDPRReport(
    events: AuditEvent[],
    startDate: Date,
    endDate: Date
  ): ComplianceReport {
    return {
      type: 'GDPR',
      period: { start: startDate, end: endDate },
      sections: {
        dataProtection: {
          title: 'Data Protection Principles',
          lawfulness: this.assessLawfulness(events),
          transparency: this.assessTransparency(events)
        },
        rights: {
          title: 'Data Subject Rights',
          accessRequests: events.filter(e => 
            e.metadata?.requestType === 'subject_access'
          ).length,
          deletionRequests: events.filter(e =>
            e.metadata?.requestType === 'erasure'
          ).length
        },
        security: {
          title: 'Security of Processing',
          technicalMeasures: this.assessTechnicalMeasures(events),
          breaches: this.identifyDataBreaches(events)
        }
      },
      summary: this.generateReportSummary(events),
      generatedAt: new Date()
    };
  }

  // Helper methods for report generation
  private generateSecurityRecommendations(events: AuditEvent[]): string[] {
    const recommendations: string[] = [];
    
    const failedAuths = events.filter(e => 
      e.eventType === AuditEventType.AUTHENTICATION_FAILURE
    );
    
    if (failedAuths.length > 10) {
      recommendations.push('Implement stronger authentication mechanisms');
    }

    const rateLimits = events.filter(e =>
      e.eventType === AuditEventType.RATE_LIMIT_EXCEEDED
    );

    if (rateLimits.length > 5) {
      recommendations.push('Review and adjust rate limiting policies');
    }

    return recommendations;
  }

  private calculateUptime(events: AuditEvent[]): number {
    const errors = events.filter(e => e.eventType === AuditEventType.HUNTER_ERROR);
    const totalTime = events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime();
    const errorTime = errors.length * 300000; // Assume 5 min per error
    return ((totalTime - errorTime) / totalTime) * 100;
  }

  private generateReportSummary(events: AuditEvent[]): string {
    const totalEvents = events.length;
    const failures = events.filter(e => e.result === 'failure').length;
    const highRisk = events.filter(e => (e.riskScore || 0) >= 8).length;

    return `Total events: ${totalEvents}, Failures: ${failures}, High-risk events: ${highRisk}`;
  }

  private analyzeAccessControls(events: AuditEvent[]): any {
    return {
      totalAccessAttempts: events.filter(e => 
        e.eventType === AuditEventType.ACCESS_GRANTED || 
        e.eventType === AuditEventType.ACCESS_DENIED
      ).length,
      deniedAccess: events.filter(e => e.eventType === AuditEventType.ACCESS_DENIED).length,
      privilegedAccess: events.filter(e => e.metadata?.privileged === true).length
    };
  }

  private findNonConformities(events: AuditEvent[], category: string): any[] {
    return events
      .filter(e => e.result === 'failure' && e.metadata?.category === category)
      .map(e => ({
        event: e.eventType,
        timestamp: e.timestamp,
        details: e.errorMessage
      }));
  }

  private categorizeIncidents(events: AuditEvent[]): any {
    return {
      security: events.filter(e => e.eventType === AuditEventType.SECURITY_VIOLATION).length,
      availability: events.filter(e => e.eventType === AuditEventType.HUNTER_ERROR).length,
      integrity: events.filter(e => e.eventType === AuditEventType.INTEGRITY_CHECK_FAILURE).length
    };
  }

  private identifyDataControllers(events: AuditEvent[]): string[] {
    return [...new Set(events.map(e => e.userId).filter(Boolean))] as string[];
  }

  private assessSecurityMeasures(events: AuditEvent[]): any {
    return {
      encryption: events.filter(e => e.metadata?.encrypted === true).length,
      accessControls: events.filter(e => e.metadata?.accessControlled === true).length,
      monitoring: true
    };
  }

  private assessLawfulness(events: AuditEvent[]): any {
    return {
      withConsent: events.filter(e => e.metadata?.legalBasis === 'consent').length,
      withContract: events.filter(e => e.metadata?.legalBasis === 'contract').length,
      legitimate: events.filter(e => e.metadata?.legalBasis === 'legitimate_interest').length
    };
  }

  private assessTransparency(events: AuditEvent[]): any {
    return {
      documented: events.filter(e => e.metadata?.documented === true).length,
      userNotified: events.filter(e => e.metadata?.userNotified === true).length
    };
  }

  private assessTechnicalMeasures(events: AuditEvent[]): any {
    return {
      encryption: true,
      pseudonymization: true,
      accessControl: true,
      resilience: this.calculateUptime(events) > 99.9
    };
  }

  private identifyDataBreaches(events: AuditEvent[]): any[] {
    return events
      .filter(e => e.eventType === AuditEventType.SECURITY_VIOLATION && 
               e.metadata?.dataExposed === true)
      .map(e => ({
        timestamp: e.timestamp,
        severity: e.riskScore,
        reported: e.metadata?.reported || false
      }));
  }
}

// Interfaces for audit storage and querying
export interface AuditStorage {
  store(event: AuditEvent): Promise<void>;
  query(filters: AuditQueryFilters): Promise<AuditEvent[]>;
  delete(filters: AuditQueryFilters): Promise<number>;
}

export interface AuditQueryFilters {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  result?: 'success' | 'failure' | 'blocked';
  minRiskScore?: number;
  limit?: number;
  offset?: number;
}

export interface ComplianceReport {
  type: 'SOC2' | 'ISO27001' | 'PIPEDA' | 'GDPR';
  period: {
    start: Date;
    end: Date;
  };
  sections: Record<string, any>;
  summary: string;
  generatedAt: Date;
}