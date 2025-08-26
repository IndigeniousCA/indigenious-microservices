import { logger } from '@/lib/monitoring/logger';
import { encryptionService } from './encryption';

export interface AuditLog {
  id?: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
  result: 'success' | 'failure' | 'error';
  risk?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityLog {
  id?: string;
  timestamp: Date;
  event: SecurityEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, any>;
  ip?: string;
  userId?: string;
  remediation?: string;
}

export type SecurityEventType = 
  | 'auth_failure'
  | 'permission_denied'
  | 'rate_limit'
  | 'suspicious_activity'
  | 'injection_attempt'
  | 'unauthorized_access'
  | 'data_breach_attempt'
  | 'false_flag_operation'
  | 'crisis_exploitation'
  | 'strategic_operation';

export class PRSecurityAuditLogger {
  private static instance: PRSecurityAuditLogger;
  
  private constructor() {}
  
  static getInstance(): PRSecurityAuditLogger {
    if (!PRSecurityAuditLogger.instance) {
      PRSecurityAuditLogger.instance = new PRSecurityAuditLogger();
    }
    return PRSecurityAuditLogger.instance;
  }
  
  // Sanitize data before logging
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove potential injection patterns
      return data
        .replace(/[<>&'"]/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .substring(0, 1000); // Limit length
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      const sensitiveFields = [
        'password', 'token', 'apiKey', 'secret', 'credential',
        'ssn', 'sin', 'creditCard', 'bankAccount'
      ];
      
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }
  
  async log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const sanitized = {
        ...entry,
        details: this.sanitizeData(entry.details),
        timestamp: new Date()
      };
      
      // Log to monitoring service
      logger.info('PR Audit Log:', sanitized);
      
      // Store in database
      const { default: prisma } = await import('@/lib/prisma');
      await prisma.prAuditLog.create({
        data: {
          userId: sanitized.userId,
          action: sanitized.action,
          resource: sanitized.resource,
          details: sanitized.details,
          ip: sanitized.ip,
          userAgent: sanitized.userAgent,
          result: sanitized.result,
          risk: sanitized.risk,
          timestamp: sanitized.timestamp
        }
      });
      
      // Alert on high-risk actions
      if (entry.risk === 'high' || entry.risk === 'critical') {
        await this.alertHighRiskAction(sanitized);
      }
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      // Don't throw - audit failures shouldn't break operations
    }
  }
  
  async logSecurity(entry: Omit<SecurityLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const sanitized = {
        ...entry,
        details: this.sanitizeData(entry.details),
        timestamp: new Date()
      };
      
      // Log to monitoring service
      logger.warn('PR Security Event:', sanitized);
      
      // Store in database
      const { default: prisma } = await import('@/lib/prisma');
      await prisma.prSecurityLog.create({
        data: {
          event: sanitized.event,
          severity: sanitized.severity,
          details: sanitized.details,
          ip: sanitized.ip,
          userId: sanitized.userId,
          remediation: sanitized.remediation,
          timestamp: sanitized.timestamp
        }
      });
      
      // Alert on critical events
      if (entry.severity === 'critical') {
        await this.alertCriticalEvent(sanitized);
      }
    } catch (error) {
      logger.error('Failed to create security log:', error);
    }
  }
  
  // Log strategic operations with encryption
  async logStrategicOperation(
    userId: string,
    operation: string,
    details: Record<string, any>,
    classification: 'confidential' | 'secret' | 'top_secret' = 'confidential'
  ): Promise<void> {
    try {
      // Encrypt sensitive details
      const encrypted = encryptionService.encryptObject(
        { details },
        ['details']
      );
      
      await this.log({
        userId,
        action: `strategic_operation.${operation}`,
        resource: 'pr_operations',
        details: {
          operation,
          classification,
          encrypted: encrypted.details,
          encryption: encrypted._encryption
        },
        result: 'success',
        risk: 'high'
      });
    } catch (error) {
      logger.error('Failed to log strategic operation:', error);
    }
  }
  
  // Query audit logs with decryption
  async queryAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
      risk?: string;
    },
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      
      const logs = await prisma.prAuditLog.findMany({
        where: {
          userId: filters.userId,
          action: filters.action,
          resource: filters.resource,
          risk: filters.risk as any,
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
      
      // Decrypt any encrypted details
      return logs.map(log => {
        if (log.details?._encryption) {
          const decrypted = encryptionService.decryptObject(log.details);
          return { ...log, details: decrypted };
        }
        return log;
      });
    } catch (error) {
      logger.error('Failed to query audit logs:', error);
      return [];
    }
  }
  
  // Compliance reporting
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: Record<string, number>;
    riskBreakdown: Record<string, number>;
    userActivity: Record<string, number>;
    securityEvents: SecurityLog[];
  }> {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      
      // Get audit logs
      const auditLogs = await prisma.prAuditLog.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate }
        }
      });
      
      // Get security logs
      const securityLogs = await prisma.prSecurityLog.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate }
        },
        orderBy: { severity: 'desc' },
        take: 100
      });
      
      // Generate summary
      const summary: Record<string, number> = {};
      const riskBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      const userActivity: Record<string, number> = {};
      
      auditLogs.forEach(log => {
        summary[log.action] = (summary[log.action] || 0) + 1;
        if (log.risk) {
          riskBreakdown[log.risk] = (riskBreakdown[log.risk] || 0) + 1;
        }
        userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
      });
      
      return {
        summary,
        riskBreakdown,
        userActivity,
        securityEvents: securityLogs
      };
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }
  
  private async alertHighRiskAction(log: AuditLog): Promise<void> {
    // Send to monitoring system
    logger.error('HIGH RISK ACTION DETECTED:', {
      userId: log.userId,
      action: log.action,
      risk: log.risk,
      details: log.details
    });
    
    // Could send email, Slack, PagerDuty, etc.
  }
  
  private async alertCriticalEvent(log: SecurityLog): Promise<void> {
    // Send to monitoring system
    logger.error('CRITICAL SECURITY EVENT:', {
      event: log.event,
      severity: log.severity,
      userId: log.userId,
      details: log.details
    });
    
    // Trigger incident response
  }
}

export const prAuditLogger = PRSecurityAuditLogger.getInstance();