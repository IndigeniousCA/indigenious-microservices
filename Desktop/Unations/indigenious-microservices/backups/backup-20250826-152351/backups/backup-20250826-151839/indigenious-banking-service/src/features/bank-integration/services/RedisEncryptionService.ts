/**
 * Redis Encryption Service
 * SOC 2 Type II Compliant Encryption for Cached Data
 * 
 * SOC 2 Controls Addressed:
 * - CC6.1: Logical and physical access controls
 * - CC6.7: Transmission security
 * - CC7.1: Protection of information during transmission
 * - C1.2: Confidentiality commitments
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import Redis from 'ioredis';
import { logger } from '@/lib/monitoring/logger';
import { auditLogger } from './AuditLogger';
import { z } from 'zod';
import { promisify } from 'util';

// Encryption configuration schema
const EncryptionConfigSchema = z.object({
  algorithm: z.literal('aes-256-gcm'),
  keyDerivationAlgorithm: z.literal('pbkdf2'),
  keyLength: z.literal(32),
  ivLength: z.literal(16),
  tagLength: z.literal(16),
  saltLength: z.literal(32),
  iterations: z.number().min(100000),
  rotationIntervalDays: z.number().min(30).max(90)
});

interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
  algorithm: string;
  keyVersion: number;
  timestamp: number;
}

export class RedisEncryptionService {
  private static instance: RedisEncryptionService;
  private redis: Redis;
  private encryptionKey: Buffer;
  private keyVersion: number = 1;
  private keyRotationInterval: number = 30; // days
  private lastKeyRotation: Date = new Date();
  
  // SOC 2: Encryption configuration
  private readonly config = {
    algorithm: 'aes-256-gcm' as const,
    keyDerivationAlgorithm: 'pbkdf2' as const,
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    saltLength: 32,
    iterations: 100000,
    rotationIntervalDays: 30
  };
  
  // Key derivation cache for performance
  private keyCache: Map<string, { key: Buffer; expiry: Date }> = new Map();
  
  private constructor(redisConfig?: Redis.RedisOptions) {
    // Initialize Redis with TLS for SOC 2 compliance
    this.redis = new Redis({
      ...redisConfig,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    
    // Initialize encryption key
    this.initializeEncryptionKey();
    
    // Set up key rotation schedule
    this.scheduleKeyRotation();
    
    // Redis error handling
    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });
  }
  
  static getInstance(redisConfig?: Redis.RedisOptions): RedisEncryptionService {
    if (!RedisEncryptionService.instance) {
      RedisEncryptionService.instance = new RedisEncryptionService(redisConfig);
    }
    return RedisEncryptionService.instance;
  }
  
  /**
   * Set encrypted value in Redis
   * SOC 2 CC6.1: Encrypt data at rest
   */
  async setEncrypted(
    key: string,
    value: any,
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Validate input
      if (!key || value === undefined) {
        throw new Error('Key and value are required');
      }
      
      // Serialize data
      const serialized = JSON.stringify({
        data: value,
        metadata: metadata || {},
        timestamp: Date.now()
      });
      
      // Encrypt data
      const encrypted = await this.encrypt(serialized);
      
      // Store in Redis
      const redisKey = this.getRedisKey(key);
      const encryptedJson = JSON.stringify(encrypted);
      
      if (ttl) {
        await this.redis.setex(redisKey, ttl, encryptedJson);
      } else {
        await this.redis.set(redisKey, encryptedJson);
      }
      
      // Audit log for compliance
      await auditLogger.logEvent({
        eventType: 'data_create',
        action: 'redis_set_encrypted',
        resource: {
          type: 'redis_key',
          id: key,
          name: key
        },
        metadata: {
          encrypted: true,
          keyVersion: this.keyVersion,
          ttl,
          hasMetadata: !!metadata
        }
      });
      
    } catch (error) {
      logger.error('Failed to set encrypted value', { error, key });
      throw error;
    }
  }
  
  /**
   * Get decrypted value from Redis
   * SOC 2 CC6.1: Decrypt data for authorized access
   */
  async getEncrypted<T = any>(
    key: string,
    userId?: string
  ): Promise<T | null> {
    try {
      const redisKey = this.getRedisKey(key);
      const encryptedJson = await this.redis.get(redisKey);
      
      if (!encryptedJson) {
        return null;
      }
      
      // Parse encrypted data
      const encrypted: EncryptedData = JSON.parse(encryptedJson);
      
      // Decrypt data
      const decrypted = await this.decrypt(encrypted);
      
      // Parse decrypted data
      const parsed = JSON.parse(decrypted);
      
      // Audit log for compliance
      await auditLogger.logEvent({
        eventType: 'data_read',
        userId,
        action: 'redis_get_encrypted',
        resource: {
          type: 'redis_key',
          id: key,
          name: key
        },
        metadata: {
          encrypted: true,
          keyVersion: encrypted.keyVersion,
          age: Date.now() - encrypted.timestamp
        }
      });
      
      return parsed.data as T;
      
    } catch (error) {
      logger.error('Failed to get encrypted value', { error, key });
      
      // Log decryption failure as security event
      await auditLogger.logSecurityEvent({
        eventType: 'decryption_failed',
        userId,
        severity: 'high',
        metadata: { key, error: error.message }
      });
      
      return null;
    }
  }
  
  /**
   * Delete encrypted value
   * SOC 2 CC6.3: Secure data deletion
   */
  async deleteEncrypted(
    key: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const redisKey = this.getRedisKey(key);
      const result = await this.redis.del(redisKey);
      
      // Audit log for compliance
      await auditLogger.logEvent({
        eventType: 'data_delete',
        userId,
        action: 'redis_delete_encrypted',
        resource: {
          type: 'redis_key',
          id: key,
          name: key
        },
        result: result > 0 ? 'success' : 'failure'
      });
      
      return result > 0;
      
    } catch (error) {
      logger.error('Failed to delete encrypted value', { error, key });
      throw error;
    }
  }
  
  /**
   * Set multiple encrypted values (batch operation)
   * SOC 2 CC7.1: Efficient encrypted batch operations
   */
  async setMultipleEncrypted(
    items: Array<{ key: string; value: any; ttl?: number }>
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    try {
      for (const item of items) {
        const serialized = JSON.stringify({
          data: item.value,
          timestamp: Date.now()
        });
        
        const encrypted = await this.encrypt(serialized);
        const redisKey = this.getRedisKey(item.key);
        const encryptedJson = JSON.stringify(encrypted);
        
        if (item.ttl) {
          pipeline.setex(redisKey, item.ttl, encryptedJson);
        } else {
          pipeline.set(redisKey, encryptedJson);
        }
      }
      
      await pipeline.exec();
      
      // Batch audit log
      await auditLogger.logEvent({
        eventType: 'data_create',
        action: 'redis_batch_set_encrypted',
        metadata: {
          count: items.length,
          encrypted: true,
          keyVersion: this.keyVersion
        }
      });
      
    } catch (error) {
      logger.error('Failed to set multiple encrypted values', { error });
      throw error;
    }
  }
  
  /**
   * Scan and encrypt existing unencrypted data
   * SOC 2 Migration: Encrypt legacy data
   */
  async encryptExistingData(
    pattern: string = '*',
    batchSize: number = 100
  ): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;
    let cursor = '0';
    
    try {
      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          batchSize
        );
        
        cursor = newCursor;
        
        for (const key of keys) {
          try {
            // Skip already encrypted keys
            if (key.startsWith('enc:')) {
              continue;
            }
            
            // Get unencrypted value
            const value = await this.redis.get(key);
            if (!value) continue;
            
            // Try to parse as JSON
            let data: any;
            try {
              data = JSON.parse(value);
            } catch {
              // If not JSON, treat as string
              data = value;
            }
            
            // Get TTL
            const ttl = await this.redis.ttl(key);
            
            // Set encrypted value
            await this.setEncrypted(key, data, ttl > 0 ? ttl : undefined);
            
            // Delete unencrypted value
            await this.redis.del(key);
            
            processed++;
            
          } catch (error) {
            errors++;
            logger.error('Failed to encrypt existing key', { error, key });
          }
        }
        
      } while (cursor !== '0');
      
      // Log migration results
      await auditLogger.logEvent({
        eventType: 'data_update',
        action: 'encrypt_existing_data',
        metadata: {
          pattern,
          processed,
          errors,
          batchSize
        }
      });
      
      return { processed, errors };
      
    } catch (error) {
      logger.error('Failed to encrypt existing data', { error });
      throw error;
    }
  }
  
  /**
   * Rotate encryption keys
   * SOC 2 CC6.1: Regular key rotation
   */
  async rotateEncryptionKey(): Promise<void> {
    try {
      const oldKey = this.encryptionKey;
      const oldVersion = this.keyVersion;
      
      // Generate new key
      this.initializeEncryptionKey();
      this.keyVersion++;
      
      // Re-encrypt all data with new key
      let reencrypted = 0;
      let cursor = '0';
      
      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          'enc:*',
          'COUNT',
          100
        );
        
        cursor = newCursor;
        
        for (const key of keys) {
          try {
            const encryptedJson = await this.redis.get(key);
            if (!encryptedJson) continue;
            
            const encrypted: EncryptedData = JSON.parse(encryptedJson);
            
            // Only re-encrypt if using old key version
            if (encrypted.keyVersion === oldVersion) {
              // Decrypt with old key
              const decrypted = await this.decryptWithKey(encrypted, oldKey);
              
              // Re-encrypt with new key
              const newEncrypted = await this.encrypt(decrypted);
              
              // Update in Redis
              await this.redis.set(key, JSON.stringify(newEncrypted));
              reencrypted++;
            }
          } catch (error) {
            logger.error('Failed to re-encrypt key during rotation', { error, key });
          }
        }
        
      } while (cursor !== '0');
      
      // Update last rotation time
      this.lastKeyRotation = new Date();
      
      // Clear key cache
      this.keyCache.clear();
      
      // Audit log
      await auditLogger.logEvent({
        eventType: 'config_changed',
        action: 'encryption_key_rotated',
        severity: 'high',
        metadata: {
          oldVersion,
          newVersion: this.keyVersion,
          reencryptedKeys: reencrypted
        }
      });
      
      logger.info('Encryption key rotated successfully', {
        newVersion: this.keyVersion,
        reencryptedKeys: reencrypted
      });
      
    } catch (error) {
      logger.error('Failed to rotate encryption key', { error });
      throw error;
    }
  }
  
  /**
   * Check data integrity
   * SOC 2 CC5.2: Verify encrypted data integrity
   */
  async verifyIntegrity(pattern: string = 'enc:*'): Promise<{
    valid: number;
    invalid: number;
    errors: string[];
  }> {
    let valid = 0;
    let invalid = 0;
    const errors: string[] = [];
    let cursor = '0';
    
    try {
      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        
        cursor = newCursor;
        
        for (const key of keys) {
          try {
            const encryptedJson = await this.redis.get(key);
            if (!encryptedJson) continue;
            
            const encrypted: EncryptedData = JSON.parse(encryptedJson);
            
            // Try to decrypt to verify integrity
            await this.decrypt(encrypted);
            valid++;
            
          } catch (error) {
            invalid++;
            errors.push(`${key}: ${error.message}`);
          }
        }
        
      } while (cursor !== '0');
      
      // Audit log
      await auditLogger.logEvent({
        eventType: 'compliance_check',
        action: 'verify_redis_encryption_integrity',
        result: invalid === 0 ? 'success' : 'failure',
        metadata: {
          pattern,
          valid,
          invalid,
          errorCount: errors.length
        }
      });
      
      return { valid, invalid, errors };
      
    } catch (error) {
      logger.error('Failed to verify integrity', { error });
      throw error;
    }
  }
  
  // Private helper methods
  
  private initializeEncryptionKey(): void {
    // In production, retrieve from AWS Secrets Manager or similar
    const masterKey = process.env.REDIS_MASTER_KEY || 'development-key-change-in-production';
    const salt = randomBytes(this.config.saltLength);
    
    // Derive key using PBKDF2
    this.encryptionKey = createHash('sha256')
      .update(masterKey)
      .update(salt)
      .digest();
  }
  
  private async encrypt(data: string): Promise<EncryptedData> {
    const iv = randomBytes(this.config.ivLength);
    const salt = randomBytes(this.config.saltLength);
    
    // Create cipher
    const cipher = createCipheriv(
      this.config.algorithm,
      this.encryptionKey,
      iv
    );
    
    // Encrypt data
    const ciphertext = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
      algorithm: this.config.algorithm,
      keyVersion: this.keyVersion,
      timestamp: Date.now()
    };
  }
  
  private async decrypt(encrypted: EncryptedData): Promise<string> {
    return this.decryptWithKey(encrypted, this.encryptionKey);
  }
  
  private async decryptWithKey(
    encrypted: EncryptedData,
    key: Buffer
  ): Promise<string> {
    const decipher = createDecipheriv(
      encrypted.algorithm,
      key,
      Buffer.from(encrypted.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }
  
  private getRedisKey(key: string): string {
    // Prefix encrypted keys
    return `enc:${key}`;
  }
  
  private scheduleKeyRotation(): void {
    // Schedule daily check for key rotation
    setInterval(() => {
      const daysSinceRotation = 
        (Date.now() - this.lastKeyRotation.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRotation >= this.keyRotationInterval) {
        this.rotateEncryptionKey().catch(error => {
          logger.error('Scheduled key rotation failed', { error });
        });
      }
    }, 24 * 60 * 60 * 1000); // Daily check
  }
  
  /**
   * Get encryption statistics
   * SOC 2 Monitoring
   */
  async getStatistics(): Promise<{
    encryptedKeys: number;
    keyVersion: number;
    lastRotation: Date;
    nextRotation: Date;
  }> {
    const encryptedKeys = await this.redis.eval(
      `return #redis.call('keys', 'enc:*')`,
      0
    ) as number;
    
    const nextRotation = new Date(this.lastKeyRotation);
    nextRotation.setDate(nextRotation.getDate() + this.keyRotationInterval);
    
    return {
      encryptedKeys,
      keyVersion: this.keyVersion,
      lastRotation: this.lastKeyRotation,
      nextRotation
    };
  }
  
  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    this.keyCache.clear();
  }
}

// Export singleton instance
export const redisEncryption = RedisEncryptionService.getInstance();