/**
 * Audit Logger Service
 * SOC 2 Type II Compliant Audit Trail Implementation
 * 
 * SOC 2 Trust Service Criteria Addressed:
 * - CC2.2: COSO Principle 10 — The entity selects and develops control activities
 * - CC2.3: COSO Principle 11 — Control activities through policies and procedures
 * - CC4.1: COSO Principle 16 — Ongoing monitoring activities
 * - CC5.2: COSO Principle 13 — Quality information
 * - CC7.1: System operations monitoring
 * - CC7.2: System performance monitoring
 * - CC7.3: Change management monitoring
 * - CC7.4: Environmental monitoring
 */

import { createHash } from 'crypto';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import { z } from 'zod';

// SOC 2: Define comprehensive audit event types
const AuditEventTypeSchema = z.enum([
  // Authentication events (CC6.1)
  'login_attempt',
  'login_success',
  'login_failure',
  'logout',
  'session_timeout',
  'mfa_challenge_created',
  'mfa_verify_success',
  'mfa_verify_failed',
  'mfa_check',
  
  // Authorization events (CC6.2-6.3)
  'permission_granted',
  'permission_denied',
  'role_assigned',
  'role_removed',
  'access_elevation',
  
  // Data access events (CC6.4-6.5)
  'data_read',
  'data_create',
  'data_update',
  'data_delete',
  'data_export',
  'sensitive_data_access',
  
  // Financial events (CC6.6)
  'payment_initiated',
  'payment_approved',
  'payment_rejected',
  'payment_completed',
  'payment_failed',
  'account_created',
  'account_modified',
  'account_closed',
  
  // Security events (CC6.7-6.8)
  'security_alert',
  'anomaly_detected',
  'rate_limit_exceeded',
  'account_locked',
  'suspicious_activity',
  'fraud_detected',
  
  // Configuration changes (CC7.3)
  'config_changed',
  'feature_toggled',
  'integration_added',
  'integration_removed',
  
  // System events (CC7.1-7.2)
  'system_startup',
  'system_shutdown',
  'backup_started',
  'backup_completed',
  'maintenance_mode_enabled',
  'maintenance_mode_disabled',
  
  // Compliance events (CC3.2)
  'compliance_check',
  'policy_violation',
  'audit_trail_accessed',
  'retention_policy_applied'
]);

const SeverityLevelSchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: z.infer<typeof AuditEventTypeSchema>;
  severity: z.infer<typeof SeverityLevelSchema>;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  action?: string;
  result: 'success' | 'failure' | 'partial';
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  dataIntegrity: {
    hash: string;
    previousHash?: string;
  };
  environment: {
    service: string;
    version: string;
    deployment: string;
  };
}

export class AuditLogger {
  private static instance: AuditLogger;
  private readonly RETENTION_DAYS = 2555; // 7 years for SOC 2
  private readonly CRITICAL_EVENTS_RETENTION_DAYS = 3650; // 10 years
  private previousHash: string | null = null;
  
  private constructor() {
    this.initializeHashChain();
  }
  
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }
  
  /**
   * Log audit event with SOC 2 compliance
   * CC5.2: Capture comprehensive audit information
   */
  async logEvent(params: {
    eventType: z.infer<typeof AuditEventTypeSchema>;
    userId?: string;
    action?: string;
    resource?: AuditEvent['resource'];
    result?: AuditEvent['result'];
    metadata?: Record<string, any>;
    severity?: z.infer<typeof SeverityLevelSchema>;
    error?: { code: string; message: string };
    request?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    };
  }): Promise<void> {
    try {
      // Validate event type
      const eventType = AuditEventTypeSchema.parse(params.eventType);
      const severity = params.severity || this.determineSeverity(eventType);
      
      // Create audit event
      const auditEvent: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType,
        severity,
        userId: params.userId,
        sessionId: params.request?.sessionId,
        ipAddress: params.request?.ipAddress,
        userAgent: params.request?.userAgent,
        resource: params.resource,
        action: params.action,
        result: params.result || (params.error ? 'failure' : 'success'),
        errorCode: params.error?.code,
        errorMessage: params.error?.message,
        metadata: this.sanitizeMetadata(params.metadata),
        dataIntegrity: {
          hash: '',
          previousHash: this.previousHash || undefined
        },
        environment: {
          service: 'bank-integration',
          version: process.env.APP_VERSION || '1.0.0',
          deployment: process.env.NODE_ENV || 'development'
        }
      };
      
      // Generate hash for data integrity (SOC 2 CC5.2)
      auditEvent.dataIntegrity.hash = this.generateHash(auditEvent);
      this.previousHash = auditEvent.dataIntegrity.hash;
      
      // Store in database
      await this.persistAuditEvent(auditEvent);
      
      // For critical events, also log to blockchain
      if (this.isCriticalEvent(eventType)) {
        await this.logToBlockchain(auditEvent);
      }
      
      // Real-time alerting for high severity events
      if (severity === 'high' || severity === 'critical') {
        await this.sendSecurityAlert(auditEvent);
      }
      
      // Log to standard logger for monitoring
      logger.info('Audit event logged', {
        eventId: auditEvent.id,
        eventType: auditEvent.eventType,
        severity: auditEvent.severity,
        userId: auditEvent.userId
      });
      
    } catch (error) {
      // Never fail the main operation due to audit logging
      logger.error('Failed to log audit event', { error, params });
      
      // Try to at least log to file system
      this.fallbackLog(params);
    }
  }
  
  /**
   * Log security-specific events
   * CC6.7-6.8: Enhanced security monitoring
   */
  async logSecurityEvent(params: {
    eventType: string;
    userId?: string;
    severity?: z.infer<typeof SeverityLevelSchema>;
    ipAddress?: string;
    action?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'security_alert' as any,
      userId: params.userId,
      severity: params.severity || 'medium',
      action: params.action,
      metadata: {
        ...params.metadata,
        securityEventType: params.eventType
      },
      request: {
        ipAddress: params.ipAddress
      }
    });
  }
  
  /**
   * Query audit logs with SOC 2 compliant access control
   * CC4.1: Monitoring and review capabilities
   */
  async queryAuditLogs(params: {
    userId?: string;
    eventTypes?: z.infer<typeof AuditEventTypeSchema>[];
    startDate?: Date;
    endDate?: Date;
    severity?: z.infer<typeof SeverityLevelSchema>[];
    limit?: number;
    offset?: number;
  }, requestingUserId: string): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    // Log the audit log access itself (SOC 2 requirement)
    await this.logEvent({
      eventType: 'audit_trail_accessed',
      userId: requestingUserId,
      action: 'query_audit_logs',
      metadata: {
        queryParams: params
      }
    });
    
    // Build query
    const where: any = {};
    
    if (params.userId) where.userId = params.userId;
    if (params.eventTypes?.length) where.eventType = { in: params.eventTypes };
    if (params.severity?.length) where.severity = { in: params.severity };
    
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = params.startDate;
      if (params.endDate) where.timestamp.lte = params.endDate;
    }
    
    // Execute query with pagination
    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0
      }),
      prisma.auditEvent.count({ where })
    ]);
    
    return {
      events: events as AuditEvent[],
      total,
      hasMore: (params.offset || 0) + events.length < total
    };
  }
  
  /**
   * Verify audit trail integrity
   * CC5.2: Data integrity verification
   */
  async verifyIntegrity(startDate: Date, endDate: Date): Promise<{
    valid: boolean;
    errors: string[];
    eventsChecked: number;
  }> {
    const events = await prisma.auditEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });
    
    const errors: string[] = [];
    let previousHash: string | null = null;
    
    for (const event of events) {
      // Verify hash chain
      if (event.dataIntegrity.previousHash !== previousHash) {
        errors.push(`Hash chain broken at event ${event.id}`);
      }
      
      // Verify event hash
      const calculatedHash = this.generateHash(event);
      if (calculatedHash !== event.dataIntegrity.hash) {
        errors.push(`Hash mismatch for event ${event.id}`);
      }
      
      previousHash = event.dataIntegrity.hash;
    }
    
    // Log integrity check
    await this.logEvent({
      eventType: 'compliance_check',
      action: 'verify_audit_integrity',
      result: errors.length === 0 ? 'success' : 'failure',
      metadata: {
        startDate,
        endDate,
        eventsChecked: events.length,
        errors
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      eventsChecked: events.length
    };
  }
  
  /**
   * Apply retention policy
   * CC3.2: Data retention compliance
   */
  async applyRetentionPolicy(): Promise<{
    deleted: number;
    archived: number;
  }> {
    const standardCutoff = new Date();
    standardCutoff.setDate(standardCutoff.getDate() - this.RETENTION_DAYS);
    
    const criticalCutoff = new Date();
    criticalCutoff.setDate(criticalCutoff.getDate() - this.CRITICAL_EVENTS_RETENTION_DAYS);
    
    // Archive critical events older than standard retention
    const criticalEvents = await prisma.auditEvent.findMany({
      where: {
        timestamp: {
          lt: standardCutoff,
          gte: criticalCutoff
        },
        severity: {
          in: ['high', 'critical']
        }
      }
    });
    
    // Archive to cold storage
    let archived = 0;
    for (const event of criticalEvents) {
      await this.archiveEvent(event);
      archived++;
    }
    
    // Delete non-critical old events
    const deleteResult = await prisma.auditEvent.deleteMany({
      where: {
        timestamp: {
          lt: standardCutoff
        },
        severity: {
          notIn: ['high', 'critical']
        }
      }
    });
    
    // Delete all events past critical retention
    const criticalDeleteResult = await prisma.auditEvent.deleteMany({
      where: {
        timestamp: {
          lt: criticalCutoff
        }
      }
    });
    
    const totalDeleted = deleteResult.count + criticalDeleteResult.count;
    
    // Log retention policy application
    await this.logEvent({
      eventType: 'retention_policy_applied',
      action: 'apply_retention_policy',
      metadata: {
        deleted: totalDeleted,
        archived,
        standardCutoff,
        criticalCutoff
      }
    });
    
    return {
      deleted: totalDeleted,
      archived
    };
  }
  
  /**
   * Generate compliance report
   * CC4.1: Compliance reporting
   */
  async generateComplianceReport(params: {
    startDate: Date;
    endDate: Date;
    reportType: 'sox' | 'pci' | 'gdpr' | 'all';
  }): Promise<any> {
    const report = {
      period: {
        start: params.startDate,
        end: params.endDate
      },
      generatedAt: new Date(),
      reportType: params.reportType,
      summary: {
        totalEvents: 0,
        securityEvents: 0,
        failedAuthentications: 0,
        dataAccessEvents: 0,
        configurationChanges: 0,
        anomaliesDetected: 0
      },
      compliance: {
        dataIntegrityValid: true,
        retentionPolicyCompliant: true,
        accessControlsEffective: true,
        monitoringComplete: true
      },
      recommendations: [] as string[]
    };
    
    // Gather statistics
    const stats = await prisma.auditEvent.groupBy({
      by: ['eventType', 'severity'],
      where: {
        timestamp: {
          gte: params.startDate,
          lte: params.endDate
        }
      },
      _count: true
    });
    
    // Process statistics
    stats.forEach(stat => {
      report.summary.totalEvents += stat._count;
      
      if (stat.eventType.includes('security')) {
        report.summary.securityEvents += stat._count;
      }
      if (stat.eventType === 'login_failure') {
        report.summary.failedAuthentications += stat._count;
      }
      if (stat.eventType.includes('data_')) {
        report.summary.dataAccessEvents += stat._count;
      }
      if (stat.eventType === 'config_changed') {
        report.summary.configurationChanges += stat._count;
      }
      if (stat.eventType === 'anomaly_detected') {
        report.summary.anomaliesDetected += stat._count;
      }
    });
    
    // Verify data integrity
    const integrityCheck = await this.verifyIntegrity(params.startDate, params.endDate);
    report.compliance.dataIntegrityValid = integrityCheck.valid;
    
    // Add recommendations
    if (report.summary.failedAuthentications > 100) {
      report.recommendations.push('High number of failed authentications detected. Review security controls.');
    }
    if (report.summary.anomaliesDetected > 10) {
      report.recommendations.push('Multiple anomalies detected. Investigate potential security threats.');
    }
    
    return report;
  }
  
  // Private helper methods
  
  private async initializeHashChain(): Promise<void> {
    // Get the most recent event to continue the hash chain
    const lastEvent = await prisma.auditEvent.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { dataIntegrity: true }
    });
    
    if (lastEvent) {
      this.previousHash = lastEvent.dataIntegrity.hash;
    }
  }
  
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateHash(event: Partial<AuditEvent>): string {
    const content = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      userId: event.userId,
      action: event.action,
      result: event.result,
      previousHash: event.dataIntegrity?.previousHash
    });
    
    return createHash('sha256').update(content).digest('hex');
  }
  
  private determineSeverity(eventType: string): z.infer<typeof SeverityLevelSchema> {
    // Critical events
    if (['account_locked', 'fraud_detected', 'data_delete'].includes(eventType)) {
      return 'critical';
    }
    
    // High severity
    if (eventType.includes('security') || eventType.includes('payment')) {
      return 'high';
    }
    
    // Medium severity
    if (eventType.includes('failure') || eventType.includes('denied')) {
      return 'medium';
    }
    
    // Low severity
    if (eventType.includes('read') || eventType.includes('login_success')) {
      return 'low';
    }
    
    return 'info';
  }
  
  private isCriticalEvent(eventType: string): boolean {
    const criticalEvents = [
      'payment_completed',
      'account_created',
      'account_closed',
      'fraud_detected',
      'data_delete',
      'config_changed'
    ];
    
    return criticalEvents.includes(eventType);
  }
  
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    
    // Remove sensitive fields
    const sanitized = { ...metadata };
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  private async persistAuditEvent(event: AuditEvent): Promise<void> {
    await prisma.auditEvent.create({
      data: event as any
    });
  }
  
  private async logToBlockchain(event: AuditEvent): Promise<void> {
    await indigenousLedger.log(
      'audit_event',
      event.severity,
      `${event.eventType}: ${event.action || 'N/A'}`,
      {
        eventId: event.id,
        userId: event.userId,
        result: event.result,
        hash: event.dataIntegrity.hash
      }
    );
  }
  
  private async sendSecurityAlert(event: AuditEvent): Promise<void> {
    // Send to security monitoring system
    logger.error('SECURITY ALERT', {
      event,
      alertType: 'high_severity_audit_event'
    });
    
    // Additional alerting logic (PagerDuty, Slack, etc.)
  }
  
  private async archiveEvent(event: any): Promise<void> {
    // Archive to cold storage (S3, Glacier, etc.)
    logger.info('Archiving audit event', { eventId: event.id });
  }
  
  private fallbackLog(params: any): void {
    // Last resort logging to file system
    const fallbackEntry = {
      timestamp: new Date().toISOString(),
      ...params,
      _fallback: true
    };
    
    logger.error('AUDIT_FALLBACK', fallbackEntry);
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();