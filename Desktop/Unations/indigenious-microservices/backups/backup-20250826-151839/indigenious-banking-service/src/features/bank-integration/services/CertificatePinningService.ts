/**
 * Certificate Pinning Service
 * SOC 2 Type II Compliant SSL/TLS Certificate Validation
 * 
 * SOC 2 Controls Addressed:
 * - CC6.1: Logical access controls
 * - CC6.7: Transmission security
 * - CC6.8: Prevention of malicious software
 * - CC7.1: Detection and monitoring of security events
 */

import https from 'https';
import tls from 'tls';
import crypto from 'crypto';
import { logger } from '@/lib/monitoring/logger';
import { auditLogger } from './AuditLogger';
import { redisEncryption } from './RedisEncryptionService';
import { EventEmitter } from 'events';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

// Certificate pin configuration schema
const CertificatePinSchema = z.object({
  hostname: z.string(),
  pins: z.array(z.object({
    algorithm: z.enum(['sha256', 'sha384', 'sha512']),
    fingerprint: z.string(),
    expiresAt: z.date().optional(),
    isBackup: z.boolean().default(false)
  })),
  includeSubdomains: z.boolean().default(false),
  maxAge: z.number().default(5184000), // 60 days in seconds
  reportUri: z.string().optional(),
  enforceMode: z.boolean().default(true)
});

const PinValidationResultSchema = z.object({
  valid: boolean,
  hostname: z.string(),
  matchedPin: z.string().optional(),
  error: z.string().optional(),
  certificateChain: z.array(z.object({
    subject: z.string(),
    issuer: z.string(),
    fingerprint: z.string(),
    validFrom: z.date(),
    validTo: z.date()
  }))
});

type CertificatePin = z.infer<typeof CertificatePinSchema>;
type PinValidationResult = z.infer<typeof PinValidationResultSchema>;

export class CertificatePinningService extends EventEmitter {
  private static instance: CertificatePinningService;
  private pins: Map<string, CertificatePin> = new Map();
  private validationCache: Map<string, { result: PinValidationResult; expires: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly PIN_FILE_PATH = process.env.CERT_PIN_FILE || './config/certificate-pins.json';
  
  // Bank certificate pins (production)
  private readonly BANK_PINS: Record<string, CertificatePin> = {
    'api-gateway.scotiabank.com': {
      hostname: 'api-gateway.scotiabank.com',
      pins: [
        {
          algorithm: 'sha256',
          fingerprint: 'PRODUCTION_SCOTIA_PIN_1', // Replace with actual pin
          isBackup: false
        },
        {
          algorithm: 'sha256',
          fingerprint: 'PRODUCTION_SCOTIA_PIN_2', // Backup pin
          isBackup: true
        }
      ],
      includeSubdomains: true,
      enforceMode: true
    },
    'api.rbc.com': {
      hostname: 'api.rbc.com',
      pins: [
        {
          algorithm: 'sha256',
          fingerprint: 'PRODUCTION_RBC_PIN_1',
          isBackup: false
        }
      ],
      includeSubdomains: false,
      enforceMode: true
    },
    'api.td.com': {
      hostname: 'api.td.com',
      pins: [
        {
          algorithm: 'sha256',
          fingerprint: 'PRODUCTION_TD_PIN_1',
          isBackup: false
        }
      ],
      includeSubdomains: true,
      enforceMode: true
    }
  };
  
  private constructor() {
    super();
    this.loadPins();
    this.setupPeriodicValidation();
  }
  
  static getInstance(): CertificatePinningService {
    if (!CertificatePinningService.instance) {
      CertificatePinningService.instance = new CertificatePinningService();
    }
    return CertificatePinningService.instance;
  }
  
  /**
   * Create HTTPS agent with certificate pinning
   * SOC 2 CC6.7: Secure transmission with certificate validation
   */
  createPinnedHttpsAgent(hostname: string, options?: https.AgentOptions): https.Agent {
    const pinConfig = this.pins.get(hostname);
    
    if (!pinConfig) {
      logger.warn('No certificate pins configured for hostname', { hostname });
    }
    
    const agent = new https.Agent({
      ...options,
      checkServerIdentity: (servername: string, cert: tls.PeerCertificate) => {
        // First, perform standard hostname verification
        const error = tls.checkServerIdentity(servername, cert);
        if (error) {
          return error;
        }
        
        // Then perform certificate pinning
        if (pinConfig) {
          const validationResult = this.validateCertificatePin(cert, pinConfig);
          if (!validationResult.valid) {
            const pinError = new Error(`Certificate pinning failed: ${validationResult.error}`);
            (pinError as any).code = 'CERT_PIN_VALIDATION_FAILED';
            
            // Log security event
            this.logPinningFailure(hostname, validationResult);
            
            // In enforce mode, reject the connection
            if (pinConfig.enforceMode) {
              return pinError;
            } else {
              // Report-only mode - log but allow connection
              logger.warn('Certificate pinning failed (report-only mode)', {
                hostname,
                error: validationResult.error
              });
            }
          } else {
            // Log successful validation
            this.logPinningSuccess(hostname, validationResult);
          }
        }
        
        return undefined;
      }
    });
    
    return agent;
  }
  
  /**
   * Validate certificate against pins
   * SOC 2 CC6.1: Access control through certificate validation
   */
  validateCertificatePin(cert: tls.PeerCertificate, pinConfig: CertificatePin): PinValidationResult {
    try {
      const certificateChain = this.extractCertificateChain(cert);
      
      // Check cache first
      const cacheKey = `${pinConfig.hostname}:${cert.fingerprint}`;
      const cached = this.validationCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.result;
      }
      
      // Calculate fingerprints for the certificate chain
      const fingerprints = certificateChain.map(c => ({
        sha256: this.calculateFingerprint(c.raw, 'sha256'),
        sha384: this.calculateFingerprint(c.raw, 'sha384'),
        sha512: this.calculateFingerprint(c.raw, 'sha512')
      }));
      
      // Check if any pin matches
      let matchedPin: string | undefined;
      const pinMatched = pinConfig.pins.some(pin => {
        const fingerprintToCheck = fingerprints.find(f => 
          f[pin.algorithm] === pin.fingerprint
        );
        
        if (fingerprintToCheck) {
          matchedPin = pin.fingerprint;
          
          // Check if pin is expired
          if (pin.expiresAt && new Date() > pin.expiresAt) {
            logger.warn('Matched pin is expired', {
              hostname: pinConfig.hostname,
              fingerprint: pin.fingerprint,
              expiredAt: pin.expiresAt
            });
            return false;
          }
          
          return true;
        }
        
        return false;
      });
      
      const result: PinValidationResult = {
        valid: pinMatched,
        hostname: pinConfig.hostname,
        matchedPin,
        error: pinMatched ? undefined : 'No matching certificate pin found',
        certificateChain: certificateChain.map(c => ({
          subject: c.subject,
          issuer: c.issuer,
          fingerprint: c.fingerprint,
          validFrom: new Date(c.valid_from),
          validTo: new Date(c.valid_to)
        }))
      };
      
      // Cache the result
      this.validationCache.set(cacheKey, {
        result,
        expires: Date.now() + this.CACHE_TTL
      });
      
      return result;
      
    } catch (error) {
      logger.error('Certificate validation error', { error });
      return {
        valid: false,
        hostname: pinConfig.hostname,
        error: error.message,
        certificateChain: []
      };
    }
  }
  
  /**
   * Add or update certificate pins
   * SOC 2 CC7.3: Configuration management
   */
  async updatePins(hostname: string, pins: CertificatePin['pins']): Promise<void> {
    const existingConfig = this.pins.get(hostname);
    
    const newConfig: CertificatePin = {
      hostname,
      pins,
      includeSubdomains: existingConfig?.includeSubdomains ?? false,
      maxAge: existingConfig?.maxAge ?? 5184000,
      enforceMode: existingConfig?.enforceMode ?? true
    };
    
    // Validate the new configuration
    const validated = CertificatePinSchema.parse(newConfig);
    
    // Store in memory
    this.pins.set(hostname, validated);
    
    // Persist to disk
    await this.savePins();
    
    // Clear validation cache for this hostname
    for (const [key] of this.validationCache) {
      if (key.startsWith(hostname)) {
        this.validationCache.delete(key);
      }
    }
    
    // Log configuration change
    await auditLogger.logEvent({
      eventType: 'config_changed',
      action: 'update_certificate_pins',
      severity: 'high',
      metadata: {
        hostname,
        pinCount: pins.length,
        enforceMode: validated.enforceMode
      }
    });
    
    // Emit update event
    this.emit('pins-updated', { hostname, pins });
    
    logger.info('Certificate pins updated', { hostname, pinCount: pins.length });
  }
  
  /**
   * Get current pins for a hostname
   */
  getPins(hostname: string): CertificatePin | undefined {
    return this.pins.get(hostname);
  }
  
  /**
   * Test certificate pinning for a hostname
   * SOC 2 CC7.1: Monitoring and testing
   */
  async testPinning(hostname: string): Promise<PinValidationResult> {
    return new Promise((resolve, reject) => {
      const pinConfig = this.pins.get(hostname);
      if (!pinConfig) {
        resolve({
          valid: false,
          hostname,
          error: 'No pins configured for hostname',
          certificateChain: []
        });
        return;
      }
      
      const options: tls.ConnectionOptions = {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: true
      };
      
      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate(true);
        const result = this.validateCertificatePin(cert, pinConfig);
        
        socket.end();
        resolve(result);
      });
      
      socket.on('error', (error) => {
        resolve({
          valid: false,
          hostname,
          error: error.message,
          certificateChain: []
        });
      });
      
      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({
          valid: false,
          hostname,
          error: 'Connection timeout',
          certificateChain: []
        });
      });
    });
  }
  
  /**
   * Get certificate information for a hostname
   */
  async getCertificateInfo(hostname: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: hostname,
        port: 443,
        servername: hostname
      }, () => {
        const cert = socket.getPeerCertificate(true);
        const chain = this.extractCertificateChain(cert);
        
        const info = {
          hostname,
          certificates: chain.map(c => ({
            subject: c.subject,
            issuer: c.issuer,
            validFrom: c.valid_from,
            validTo: c.valid_to,
            fingerprints: {
              sha256: this.calculateFingerprint(c.raw, 'sha256'),
              sha384: this.calculateFingerprint(c.raw, 'sha384'),
              sha512: this.calculateFingerprint(c.raw, 'sha512')
            },
            serialNumber: c.serialNumber,
            signatureAlgorithm: c.signatureAlgorithm
          }))
        };
        
        socket.end();
        resolve(info);
      });
      
      socket.on('error', reject);
      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }
  
  /**
   * Monitor certificate expiry
   * SOC 2 A1.1: Availability monitoring
   */
  async checkCertificateExpiry(): Promise<any[]> {
    const expiryWarnings = [];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    for (const [hostname, config] of this.pins) {
      try {
        const info = await this.getCertificateInfo(hostname);
        
        for (const cert of info.certificates) {
          const validTo = new Date(cert.validTo);
          
          if (validTo < thirtyDaysFromNow) {
            const warning = {
              hostname,
              subject: cert.subject,
              expiresAt: validTo,
              daysRemaining: Math.floor((validTo.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            };
            
            expiryWarnings.push(warning);
            
            // Log warning
            logger.warn('Certificate expiring soon', warning);
            
            // Emit event
            this.emit('certificate-expiry-warning', warning);
          }
        }
      } catch (error) {
        logger.error('Failed to check certificate expiry', { hostname, error });
      }
    }
    
    return expiryWarnings;
  }
  
  /**
   * Get pinning statistics
   */
  async getStatistics(): Promise<any> {
    const stats = {
      totalHostnames: this.pins.size,
      totalPins: 0,
      enforceMode: 0,
      reportOnlyMode: 0,
      validationsCached: this.validationCache.size,
      hostnameBreakdown: [] as any[]
    };
    
    for (const [hostname, config] of this.pins) {
      stats.totalPins += config.pins.length;
      
      if (config.enforceMode) {
        stats.enforceMode++;
      } else {
        stats.reportOnlyMode++;
      }
      
      stats.hostnameBreakdown.push({
        hostname,
        pinCount: config.pins.length,
        enforceMode: config.enforceMode,
        includeSubdomains: config.includeSubdomains
      });
    }
    
    return stats;
  }
  
  // Private helper methods
  
  private async loadPins(): Promise<void> {
    try {
      // Load from file if exists
      const fileContent = await fs.readFile(this.PIN_FILE_PATH, 'utf-8');
      const savedPins = JSON.parse(fileContent);
      
      for (const [hostname, config] of Object.entries(savedPins)) {
        const validated = CertificatePinSchema.parse(config);
        this.pins.set(hostname, validated);
      }
      
      logger.info('Certificate pins loaded from file', { count: this.pins.size });
    } catch (error) {
      // File doesn't exist or is invalid, use defaults
      logger.info('Loading default certificate pins');
      
      // In production, load actual pins
      if (process.env.NODE_ENV === 'production') {
        for (const [hostname, config] of Object.entries(this.BANK_PINS)) {
          this.pins.set(hostname, config);
        }
      }
    }
  }
  
  private async savePins(): Promise<void> {
    try {
      const pinsObject: Record<string, CertificatePin> = {};
      
      for (const [hostname, config] of this.pins) {
        pinsObject[hostname] = config;
      }
      
      await fs.mkdir(path.dirname(this.PIN_FILE_PATH), { recursive: true });
      await fs.writeFile(
        this.PIN_FILE_PATH,
        JSON.stringify(pinsObject, null, 2),
        'utf-8'
      );
      
      logger.info('Certificate pins saved to file');
    } catch (error) {
      logger.error('Failed to save certificate pins', { error });
    }
  }
  
  private extractCertificateChain(cert: tls.PeerCertificate): tls.PeerCertificate[] {
    const chain: tls.PeerCertificate[] = [];
    let current: tls.PeerCertificate | null = cert;
    
    while (current) {
      chain.push(current);
      current = current.issuerCertificate === current ? null : current.issuerCertificate;
    }
    
    return chain;
  }
  
  private calculateFingerprint(
    certData: Buffer,
    algorithm: 'sha256' | 'sha384' | 'sha512'
  ): string {
    return crypto.createHash(algorithm)
      .update(certData)
      .digest('base64');
  }
  
  private async logPinningFailure(
    hostname: string,
    result: PinValidationResult
  ): Promise<void> {
    await auditLogger.logSecurityEvent({
      eventType: 'certificate_pinning_failed',
      severity: 'critical',
      metadata: {
        hostname,
        error: result.error,
        certificateChain: result.certificateChain
      }
    });
    
    // Emit security event
    this.emit('pinning-failure', {
      hostname,
      result,
      timestamp: new Date()
    });
    
    // Send to monitoring
    logger.error('Certificate pinning validation failed', {
      hostname,
      error: result.error
    });
  }
  
  private async logPinningSuccess(
    hostname: string,
    result: PinValidationResult
  ): Promise<void> {
    // Only log periodically to avoid log spam
    const logKey = `success:${hostname}`;
    const lastLogged = await redisEncryption.getEncrypted<number>(logKey);
    
    if (!lastLogged || Date.now() - lastLogged > 3600000) { // Log once per hour
      await auditLogger.logEvent({
        eventType: 'data_read',
        action: 'certificate_validation_success',
        metadata: {
          hostname,
          matchedPin: result.matchedPin
        }
      });
      
      await redisEncryption.setEncrypted(logKey, Date.now(), 3600);
    }
  }
  
  private setupPeriodicValidation(): void {
    // Check certificate expiry daily
    setInterval(() => {
      this.checkCertificateExpiry().catch(error => {
        logger.error('Periodic certificate expiry check failed', { error });
      });
    }, 24 * 60 * 60 * 1000);
    
    // Clean up expired cache entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.validationCache) {
        if (value.expires < now) {
          this.validationCache.delete(key);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

// Export singleton instance
export const certificatePinning = CertificatePinningService.getInstance();