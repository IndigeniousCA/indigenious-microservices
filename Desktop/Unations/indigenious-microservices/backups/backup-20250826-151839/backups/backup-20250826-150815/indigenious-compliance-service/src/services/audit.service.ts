import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  AuditLog,
  AuditEventType,
  AuditSeverity,
  CreateAuditLogData,
  AuditFilter,
  AuditReport,
} from '../types/audit.types';

export class AuditService {
  private static readonly RETENTION_DAYS = 2555; // 7 years for compliance

  /**
   * Create audit log entry
   */
  static async createAuditLog(data: CreateAuditLogData): Promise<AuditLog> {
    try {
      const auditId = uuidv4();
      const timestamp = new Date();

      // Generate audit hash for integrity
      const auditHash = this.generateAuditHash({
        ...data,
        timestamp: timestamp.toISOString(),
      });

      const auditLog = await prisma.auditLog.create({
        data: {
          id: auditId,
          eventType: data.eventType,
          severity: data.severity || AuditSeverity.INFO,
          userId: data.userId,
          businessId: data.businessId,
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          details: data.details,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          hash: auditHash,
          timestamp,
        },
      });

      // Store critical events in separate immutable ledger
      if (data.severity === AuditSeverity.CRITICAL) {
        await this.storeCriticalEvent(auditLog);
      }

      // Real-time alerting for suspicious activities
      if (data.eventType === AuditEventType.SUSPICIOUS_ACTIVITY) {
        await this.alertSecurityTeam(auditLog);
      }

      logger.info('Audit log created', {
        auditId,
        eventType: data.eventType,
        severity: data.severity,
      });

      return this.formatAuditLog(auditLog);
    } catch (error) {
      logger.error('Failed to create audit log', error);
      // Audit logging should never fail silently
      throw error;
    }
  }

  /**
   * Log certification created
   */
  static async logCertificationCreated(data: {
    certificationId: string;
    businessId: string;
    type: string;
    createdBy: string;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.CERTIFICATION_CREATED,
      severity: AuditSeverity.INFO,
      userId: data.createdBy,
      businessId: data.businessId,
      entityType: 'certification',
      entityId: data.certificationId,
      action: 'CREATE',
      details: `Certification of type ${data.type} created`,
      metadata: data,
    });
  }

  /**
   * Log certification updated
   */
  static async logCertificationUpdated(data: {
    certificationId: string;
    updates: any;
    updatedBy: string;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.CERTIFICATION_UPDATED,
      severity: AuditSeverity.INFO,
      userId: data.updatedBy,
      entityType: 'certification',
      entityId: data.certificationId,
      action: 'UPDATE',
      details: 'Certification updated',
      metadata: {
        updates: data.updates,
      },
    });
  }

  /**
   * Log certification renewed
   */
  static async logCertificationRenewed(data: {
    certificationId: string;
    renewalId: string;
    renewedBy: string;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.CERTIFICATION_RENEWED,
      severity: AuditSeverity.INFO,
      userId: data.renewedBy,
      entityType: 'certification',
      entityId: data.certificationId,
      action: 'RENEW',
      details: 'Certification renewed',
      metadata: {
        renewalId: data.renewalId,
      },
    });
  }

  /**
   * Log verification attempt
   */
  static async logVerification(data: {
    certificationNumber: string;
    verified: boolean;
    timestamp: Date;
    verifierId?: string;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.VERIFICATION_ATTEMPT,
      severity: data.verified ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId: data.verifierId,
      entityType: 'certification',
      entityId: data.certificationNumber,
      action: 'VERIFY',
      details: `Verification ${data.verified ? 'successful' : 'failed'}`,
      metadata: data,
    });
  }

  /**
   * Log suspicious activity
   */
  static async logSuspiciousActivity(data: {
    type: string;
    certificationNumber?: string;
    userId?: string;
    details: string;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.CRITICAL,
      userId: data.userId,
      entityType: 'security',
      entityId: data.certificationNumber || 'unknown',
      action: 'ALERT',
      details: data.details,
      metadata: data,
    });
  }

  /**
   * Log compliance check
   */
  static async logComplianceCheck(data: {
    businessId: string;
    checkType: string;
    result: string;
    issues?: string[];
    checkedBy: string;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.COMPLIANCE_CHECK,
      severity: data.issues?.length ? AuditSeverity.WARNING : AuditSeverity.INFO,
      userId: data.checkedBy,
      businessId: data.businessId,
      entityType: 'compliance',
      entityId: data.businessId,
      action: 'CHECK',
      details: `Compliance check: ${data.checkType}`,
      metadata: {
        result: data.result,
        issues: data.issues,
      },
    });
  }

  /**
   * Log document validation
   */
  static async logDocumentValidation(data: {
    documentId: string;
    documentType: string;
    valid: boolean;
    errors?: string[];
    validatedBy?: string;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.DOCUMENT_VALIDATED,
      severity: data.valid ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId: data.validatedBy,
      entityType: 'document',
      entityId: data.documentId,
      action: 'VALIDATE',
      details: `Document validation ${data.valid ? 'passed' : 'failed'}`,
      metadata: {
        documentType: data.documentType,
        errors: data.errors,
      },
    });
  }

  /**
   * Log data export
   */
  static async logDataExport(data: {
    exportType: string;
    entityType: string;
    recordCount: number;
    exportedBy: string;
    filters?: any;
  }): Promise<void> {
    await this.createAuditLog({
      eventType: AuditEventType.DATA_EXPORT,
      severity: AuditSeverity.WARNING,
      userId: data.exportedBy,
      entityType: data.entityType,
      entityId: 'export',
      action: 'EXPORT',
      details: `Exported ${data.recordCount} ${data.entityType} records`,
      metadata: {
        exportType: data.exportType,
        filters: data.filters,
      },
    });
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(filters: AuditFilter): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    try {
      const where: any = {};

      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.severity) where.severity = filters.severity;
      if (filters.userId) where.userId = filters.userId;
      if (filters.businessId) where.businessId = filters.businessId;
      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.entityId) where.entityId = filters.entityId;
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs: logs.map(log => this.formatAuditLog(log)),
        total,
      };
    } catch (error) {
      logger.error('Failed to get audit logs', error);
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(
    startDate: Date,
    endDate: Date,
    options: {
      businessId?: string;
      includeStatistics?: boolean;
      groupBy?: 'day' | 'week' | 'month';
    } = {}
  ): Promise<AuditReport> {
    try {
      const where: any = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (options.businessId) {
        where.businessId = options.businessId;
      }

      // Get audit logs
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
      });

      // Calculate statistics
      const statistics = options.includeStatistics
        ? await this.calculateStatistics(logs)
        : undefined;

      // Group by time period if requested
      const grouped = options.groupBy
        ? this.groupLogsByPeriod(logs, options.groupBy)
        : undefined;

      const report: AuditReport = {
        reportId: uuidv4(),
        generatedAt: new Date(),
        startDate,
        endDate,
        totalEvents: logs.length,
        logs: logs.map(log => this.formatAuditLog(log)),
        statistics,
        grouped,
        filters: options,
      };

      // Log report generation
      await this.logDataExport({
        exportType: 'audit_report',
        entityType: 'audit_log',
        recordCount: logs.length,
        exportedBy: 'system',
        filters: options,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate audit report', error);
      throw error;
    }
  }

  /**
   * Verify audit log integrity
   */
  static async verifyAuditIntegrity(auditId: string): Promise<boolean> {
    try {
      const auditLog = await prisma.auditLog.findUnique({
        where: { id: auditId },
      });

      if (!auditLog) {
        return false;
      }

      // Recalculate hash
      const expectedHash = this.generateAuditHash({
        eventType: auditLog.eventType,
        severity: auditLog.severity,
        userId: auditLog.userId,
        businessId: auditLog.businessId,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action,
        details: auditLog.details,
        metadata: auditLog.metadata,
        timestamp: auditLog.timestamp.toISOString(),
      });

      return auditLog.hash === expectedHash;
    } catch (error) {
      logger.error('Failed to verify audit integrity', error);
      return false;
    }
  }

  /**
   * Clean old audit logs
   */
  static async cleanOldAuditLogs(): Promise<void> {
    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.RETENTION_DAYS);

      // Archive before deletion
      const logsToArchive = await prisma.auditLog.findMany({
        where: {
          timestamp: { lt: retentionDate },
          archived: false,
        },
      });

      if (logsToArchive.length > 0) {
        // Archive to long-term storage (S3, etc.)
        await this.archiveAuditLogs(logsToArchive);

        // Mark as archived
        await prisma.auditLog.updateMany({
          where: {
            id: { in: logsToArchive.map(log => log.id) },
          },
          data: { archived: true },
        });
      }

      logger.info(`Archived ${logsToArchive.length} old audit logs`);
    } catch (error) {
      logger.error('Failed to clean old audit logs', error);
    }
  }

  /**
   * Store critical event in immutable ledger
   */
  private static async storeCriticalEvent(auditLog: any): Promise<void> {
    try {
      // In production, this would store to blockchain or immutable storage
      await redis.lpush(
        'critical_events',
        JSON.stringify({
          ...auditLog,
          storedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Failed to store critical event', error);
    }
  }

  /**
   * Alert security team
   */
  private static async alertSecurityTeam(auditLog: any): Promise<void> {
    try {
      // Send immediate alert to security team
      const alert = {
        type: 'SECURITY_ALERT',
        severity: 'CRITICAL',
        auditId: auditLog.id,
        details: auditLog.details,
        timestamp: auditLog.timestamp,
      };

      // Publish to security channel
      await redis.publish('security_alerts', JSON.stringify(alert));

      // Send email/SMS to security team
      // await NotificationService.alertSecurityTeam(alert);

      logger.warn('Security alert sent', alert);
    } catch (error) {
      logger.error('Failed to alert security team', error);
    }
  }

  /**
   * Calculate statistics from audit logs
   */
  private static async calculateStatistics(logs: any[]): Promise<any> {
    const statistics = {
      byEventType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
    };

    logs.forEach(log => {
      // By event type
      statistics.byEventType[log.eventType] = 
        (statistics.byEventType[log.eventType] || 0) + 1;

      // By severity
      statistics.bySeverity[log.severity] = 
        (statistics.bySeverity[log.severity] || 0) + 1;

      // By user
      if (log.userId) {
        statistics.byUser[log.userId] = 
          (statistics.byUser[log.userId] || 0) + 1;
      }

      // By day
      const day = log.timestamp.toISOString().split('T')[0];
      statistics.byDay[day] = (statistics.byDay[day] || 0) + 1;
    });

    return statistics;
  }

  /**
   * Group logs by time period
   */
  private static groupLogsByPeriod(
    logs: any[],
    period: 'day' | 'week' | 'month'
  ): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    logs.forEach(log => {
      let key: string;
      const date = new Date(log.timestamp);

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const week = Math.floor(date.getDate() / 7);
          key = `${date.getFullYear()}-W${week}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(log);
    });

    return grouped;
  }

  /**
   * Archive audit logs to long-term storage
   */
  private static async archiveAuditLogs(logs: any[]): Promise<void> {
    // In production, this would upload to S3 or similar
    // For now, we'll simulate archiving
    logger.info(`Archiving ${logs.length} audit logs to long-term storage`);
  }

  /**
   * Generate audit hash for integrity
   */
  private static generateAuditHash(data: any): string {
    const secret = process.env.AUDIT_SECRET || 'audit-secret';
    const content = JSON.stringify(data, Object.keys(data).sort());
    
    return crypto
      .createHmac('sha256', secret)
      .update(content)
      .digest('hex');
  }

  /**
   * Format audit log for response
   */
  private static formatAuditLog(log: any): AuditLog {
    return {
      id: log.id,
      eventType: log.eventType,
      severity: log.severity,
      userId: log.userId,
      businessId: log.businessId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      details: log.details,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      hash: log.hash,
      timestamp: log.timestamp,
    };
  }
}

export default AuditService;