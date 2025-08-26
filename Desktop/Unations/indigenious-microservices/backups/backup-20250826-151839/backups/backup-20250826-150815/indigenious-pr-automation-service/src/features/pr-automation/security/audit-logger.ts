/**
 * Nuclear-Grade Audit Logger
 * Implements tamper-proof logging with blockchain-style verification
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { EncryptionService } from './encryption.service';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/monitoring/logger';

interface AuditEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical' | 'security';
  category: string;
  action: string;
  userId?: string;
  details: Record<string, unknown>;
  metadata: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    duration?: number;
  };
  hash: string;
  previousHash: string;
  signature: string;
  sequenceNumber: number;
}

interface SecurityEvent {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  timestamp: Date;
  response?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private encryption = EncryptionService.getInstance();
  
  // Configuration
  private readonly LOG_RETENTION_DAYS = 2555; // 7 years
  private readonly CRITICAL_LOG_RETENTION_DAYS = 3650; // 10 years
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  
  // State
  private logBuffer: AuditEntry[] = [];
  private sequenceNumber: number = 0;
  private lastHash: string = '0';
  private signingKey: crypto.KeyObject;
  
  // Log destinations
  private readonly LOG_DIR = '/var/log/indigenious/audit';
  private readonly SECURITY_LOG_DIR = '/var/log/indigenious/security';
  private readonly FORENSIC_LOG_DIR = '/var/log/indigenious/forensic';
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): AuditLogger {
    if (!this.instance) {
      this.instance = new AuditLogger();
    }
    return this.instance;
  }

  /**
   * Log authentication events
   */
  async logAuth(data: {
    userId?: string;
    action: string;
    requestId?: string;
    duration?: number;
    riskScore?: number;
    ip?: string;
    reason?: string;
    permissions?: string[];
  }): Promise<void> {
    await this.log('security', 'authentication', data.action, {
      userId: data.userId,
      details: {
        riskScore: data.riskScore,
        reason: data.reason,
        permissions: data.permissions
      },
      metadata: {
        ip: data.ip,
        requestId: data.requestId,
        duration: data.duration
      }
    });
  }

  /**
   * Log security events
   */
  async logSecurity(data: {
    event: string;
    userId?: string;
    details: Record<string, unknown>;
    severity?: string;
    ip?: string;
  }): Promise<void> {
    const securityEvent: SecurityEvent = {
      event: data.event,
      severity: this.calculateSeverity(data.event),
      details: data.details,
      timestamp: new Date()
    };
    
    // Log to multiple destinations
    await Promise.all([
      this.log('security', 'security_event', data.event, {
        userId: data.userId,
        details: data.details,
        metadata: { ip: data.ip }
      }),
      this.logToSecurityFile(securityEvent),
      this.alertIfCritical(securityEvent)
    ]);
  }

  /**
   * Log encryption operations
   */
  async logEncryption(data: {
    action: string;
    keyId?: string;
    algorithm?: string;
    dataSize?: number;
    purpose?: string;
    file?: string;
  }): Promise<void> {
    await this.log('security', 'encryption', data.action, {
      details: {
        keyId: data.keyId,
        algorithm: data.algorithm,
        dataSize: data.dataSize,
        purpose: data.purpose,
        file: data.file
      }
    });
  }

  /**
   * Log key rotation events
   */
  async logKeyRotation(data: {
    oldKeyId: string;
    newKeyId: string;
    purpose: string;
  }): Promise<void> {
    await this.log('security', 'key_management', 'key_rotation', {
      details: data,
      level: 'critical'
    });
  }

  /**
   * Log errors with stack traces
   */
  async logError(data: {
    action: string;
    error: string;
    stack?: string;
    userId?: string;
    requestId?: string;
    ip?: string;
  }): Promise<void> {
    await this.log('error', 'system_error', data.action, {
      userId: data.userId,
      details: {
        error: data.error,
        stack: data.stack
      },
      metadata: {
        requestId: data.requestId,
        ip: data.ip
      }
    });
  }

  /**
   * Log PR operations
   */
  async logPROperation(data: {
    operation: string;
    type: string;
    userId: string;
    details: Record<string, unknown>;
    riskLevel?: string;
  }): Promise<void> {
    await this.log('security', 'pr_operation', data.operation, {
      userId: data.userId,
      details: {
        ...data.details,
        type: data.type,
        riskLevel: data.riskLevel
      }
    });
  }

  /**
   * Core logging method with blockchain-style integrity
   */
  private async log(
    level: AuditEntry['level'],
    category: string,
    action: string,
    data: {
      userId?: string;
      details?: any;
      metadata?: any;
    } = {}
  ): Promise<void> {
    try {
      // Create audit entry
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        level,
        category,
        action,
        userId: data.userId,
        details: await this.sanitizeAndEncrypt(data.details),
        metadata: data.metadata || {},
        hash: '', // Will be calculated
        previousHash: this.lastHash,
        signature: '', // Will be calculated
        sequenceNumber: ++this.sequenceNumber
      };
      
      // Calculate hash (blockchain style)
      entry.hash = this.calculateHash(entry);
      
      // Sign the entry
      entry.signature = await this.signEntry(entry);
      
      // Update last hash
      this.lastHash = entry.hash;
      
      // Add to buffer
      this.logBuffer.push(entry);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.BATCH_SIZE) {
        await this.flush();
      }
      
      // Replicate critical logs immediately
      if (level === 'critical' || level === 'security') {
        await this.replicateCriticalLog(entry);
      }
    } catch (error) {
      // Fallback logging to ensure we never lose audit data
      await this.emergencyLog(error, { level, category, action, data });
    }
  }

  /**
   * Flush buffered logs to persistent storage
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      // Batch insert to database
      await prisma.auditLog.createMany({
        data: logsToFlush.map(log => ({
          ...log,
          details: JSON.stringify(log.details),
          metadata: JSON.stringify(log.metadata)
        }))
      });
      
      // Write to append-only file
      await this.writeToFile(logsToFlush);
      
      // Update sequence in Redis
      await redis.set('audit:sequence', this.sequenceNumber);
      await redis.set('audit:lastHash', this.lastHash);
      
      // Archive old logs
      await this.archiveOldLogs();
    } catch (error) {
      // Write to emergency file if database fails
      await this.emergencyLog(error, logsToFlush);
    }
  }

  /**
   * Calculate cryptographic hash for log entry
   */
  private calculateHash(entry: AuditEntry): string {
    const data = [
      entry.id,
      entry.timestamp.toISOString(),
      entry.level,
      entry.category,
      entry.action,
      entry.userId || '',
      JSON.stringify(entry.details),
      JSON.stringify(entry.metadata),
      entry.previousHash,
      entry.sequenceNumber
    ].join('|');
    
    return crypto
      .createHash('sha3-256')
      .update(data)
      .digest('hex');
  }

  /**
   * Sign log entry for non-repudiation
   */
  private async signEntry(entry: AuditEntry): Promise<string> {
    const data = entry.hash;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.signingKey, 'hex');
  }

  /**
   * Verify log integrity
   */
  async verifyIntegrity(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    valid: boolean;
    errors: string[];
    stats: any;
  }> {
    const errors: string[] = [];
    let previousHash = '0';
    let count = 0;
    
    try {
      // Fetch logs in order
      const logs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { sequenceNumber: 'asc' }
      });
      
      for (const log of logs) {
        count++;
        
        // Verify hash chain
        if (log.previousHash !== previousHash) {
          errors.push(`Hash chain broken at sequence ${log.sequenceNumber}`);
        }
        
        // Recalculate and verify hash
        const calculatedHash = this.calculateHash(log as unknown);
        if (calculatedHash !== log.hash) {
          errors.push(`Hash mismatch at sequence ${log.sequenceNumber}`);
        }
        
        // Verify signature
        const validSignature = await this.verifySignature(log as unknown);
        if (!validSignature) {
          errors.push(`Invalid signature at sequence ${log.sequenceNumber}`);
        }
        
        previousHash = log.hash;
      }
      
      return {
        valid: errors.length === 0,
        errors,
        stats: {
          totalLogs: count,
          dateRange: { startDate, endDate },
          lastSequence: count > 0 ? logs[logs.length - 1].sequenceNumber : 0
        }
      };
    } catch (error) {
      errors.push(`Verification failed: ${error.message}`);
      return { valid: false, errors, stats: {} };
    }
  }

  /**
   * Export logs for compliance/forensics
   */
  async exportLogs(
    filter: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      category?: string;
      level?: string;
    },
    format: 'json' | 'csv' | 'syslog' = 'json'
  ): Promise<Buffer> {
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: filter.startDate,
          lte: filter.endDate
        },
        userId: filter.userId,
        category: filter.category,
        level: filter.level
      },
      orderBy: { timestamp: 'asc' }
    });
    
    switch (format) {
      case 'csv':
        return this.exportAsCSV(logs);
      case 'syslog':
        return this.exportAsSyslog(logs);
      default:
        return Buffer.from(JSON.stringify(logs, null, 2));
    }
  }

  /**
   * Private helper methods
   */
  private async initialize(): Promise<void> {
    // Create log directories
    await this.ensureDirectories();
    
    // Load or generate signing key
    this.signingKey = await this.loadSigningKey();
    
    // Restore state from Redis
    await this.restoreState();
    
    // Schedule periodic flush
    setInterval(() => {
      this.flush().catch((error) => logger.error('Audit log flush error:', error));
    }, this.FLUSH_INTERVAL);
    
    // Schedule integrity checks
    setInterval(() => {
      this.performIntegrityCheck().catch((error) => logger.error('Integrity check error:', error));
    }, 3600000); // Hourly
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [this.LOG_DIR, this.SECURITY_LOG_DIR, this.FORENSIC_LOG_DIR];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    }
  }

  private async loadSigningKey(): Promise<crypto.KeyObject> {
    // In production, load from HSM or secure key store
    const privateKey = process.env.AUDIT_SIGNING_KEY;
    if (!privateKey) {
      throw new Error('Audit signing key not configured');
    }
    
    return crypto.createPrivateKey({
      key: Buffer.from(privateKey, 'base64'),
      format: 'pem'
    });
  }

  private async restoreState(): Promise<void> {
    const [sequence, hash] = await Promise.all([
      redis.get('audit:sequence'),
      redis.get('audit:lastHash')
    ]);
    
    if (sequence) this.sequenceNumber = parseInt(sequence);
    if (hash) this.lastHash = hash;
  }

  private async sanitizeAndEncrypt(data: unknown): Promise<unknown> {
    if (!data) return null;
    
    // Remove sensitive fields
    const sanitized = this.sanitizeData(data);
    
    // Encrypt if sensitive
    if (this.containsSensitiveData(sanitized)) {
      const encrypted = await this.encryption.encrypt(
        JSON.stringify(sanitized),
        { purpose: 'audit' }
      );
      return { encrypted: true, data: encrypted };
    }
    
    return sanitized;
  }

  private sanitizeData(data: unknown): any {
    const sensitiveKeys = [
      'password', 'token', 'apiKey', 'secret', 
      'creditCard', 'ssn', 'sin', 'privateKey'
    ];
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  private containsSensitiveData(data: unknown): boolean {
    const str = JSON.stringify(data);
    return str.includes('REDACTED') || str.length > 1000;
  }

  private async writeToFile(logs: AuditEntry[]): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const filename = `audit-${date}.log`;
    const filepath = path.join(this.LOG_DIR, filename);
    
    const content = logs
      .map(log => JSON.stringify(log))
      .join('\n') + '\n';
    
    await fs.appendFile(filepath, content, { mode: 0o600 });
  }

  private async emergencyLog(error: Error | unknown, data: unknown): Promise<void> {
    const emergency = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      data
    };
    
    const filepath = path.join(this.LOG_DIR, 'emergency.log');
    await fs.appendFile(
      filepath, 
      JSON.stringify(emergency) + '\n',
      { mode: 0o600 }
    );
  }

  private calculateSeverity(event: string): SecurityEvent['severity'] {
    const criticalEvents = ['breach', 'unauthorized_access', 'data_leak'];
    const highEvents = ['failed_auth', 'permission_denied', 'suspicious_activity'];
    const mediumEvents = ['config_change', 'role_change'];
    
    if (criticalEvents.some(e => event.includes(e))) return 'critical';
    if (highEvents.some(e => event.includes(e))) return 'high';
    if (mediumEvents.some(e => event.includes(e))) return 'medium';
    return 'low';
  }

  private async logToSecurityFile(event: SecurityEvent): Promise<void> {
    const filename = `security-${new Date().toISOString().split('T')[0]}.log`;
    const filepath = path.join(this.SECURITY_LOG_DIR, filename);
    
    await fs.appendFile(
      filepath,
      JSON.stringify(event) + '\n',
      { mode: 0o600 }
    );
  }

  private async alertIfCritical(event: SecurityEvent): Promise<void> {
    if (event.severity === 'critical') {
      // Send immediate alerts
      await Promise.all([
        this.sendEmailAlert(event),
        this.sendSlackAlert(event),
        this.triggerPagerDuty(event)
      ]);
    }
  }

  private async replicateCriticalLog(entry: AuditEntry): Promise<void> {
    // Replicate to multiple destinations for redundancy
    await Promise.all([
      this.writeToForensicLog(entry),
      this.sendToSIEM(entry),
      this.backupToCloudStorage(entry)
    ]);
  }

  private async verifySignature(entry: AuditEntry): Promise<boolean> {
    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(entry.hash);
      
      const publicKey = crypto.createPublicKey(this.signingKey);
      return verify.verify(publicKey, entry.signature, 'hex');
    } catch {
      return false;
    }
  }

  private async archiveOldLogs(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.LOG_RETENTION_DAYS);
    
    // Archive to cold storage
    const oldLogs = await prisma.auditLog.findMany({
      where: { timestamp: { lt: cutoff } },
      take: 1000
    });
    
    if (oldLogs.length > 0) {
      await this.archiveToStorage(oldLogs);
      await prisma.auditLog.deleteMany({
        where: { id: { in: oldLogs.map(l => l.id) } }
      });
    }
  }

  private async performIntegrityCheck(): Promise<void> {
    const result = await this.verifyIntegrity(
      new Date(Date.now() - 3600000), // Last hour
      new Date()
    );
    
    if (!result.valid) {
      await this.logSecurity({
        event: 'integrity_check_failed',
        details: result.errors
      });
    }
  }

  // Stub methods for external integrations
  private async sendEmailAlert(event: SecurityEvent): Promise<void> {}
  private async sendSlackAlert(event: SecurityEvent): Promise<void> {}
  private async triggerPagerDuty(event: SecurityEvent): Promise<void> {}
  private async writeToForensicLog(entry: AuditEntry): Promise<void> {}
  private async sendToSIEM(entry: AuditEntry): Promise<void> {}
  private async backupToCloudStorage(entry: AuditEntry): Promise<void> {}
  private async archiveToStorage(logs: unknown[]): Promise<void> {}
  
  private exportAsCSV(logs: unknown[]): Buffer {
    // CSV export implementation
    return Buffer.from('');
  }
  
  private exportAsSyslog(logs: unknown[]): Buffer {
    // Syslog export implementation
    return Buffer.from('');
  }
}

export const auditLogger = AuditLogger.getInstance();