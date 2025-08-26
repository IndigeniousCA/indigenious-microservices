/**
 * Redis Encryption Service Tests
 * SOC 2 Type II Compliance Testing
 */

import { RedisEncryptionService } from '../services/RedisEncryptionService';
import Redis from 'ioredis';
import { createHash } from 'crypto';

// Mock Redis
jest.mock('ioredis');
const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  pipeline: jest.fn(() => ({
    setex: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    exec: jest.fn()
  })),
  scan: jest.fn(),
  ttl: jest.fn(),
  eval: jest.fn(),
  quit: jest.fn(),
  on: jest.fn()
};

(Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

// Mock logger
jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock audit logger
jest.mock('../services/AuditLogger', () => ({
  auditLogger: {
    logEvent: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

describe('RedisEncryptionService', () => {
  let service: RedisEncryptionService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = RedisEncryptionService.getInstance();
  });
  
  describe('setEncrypted', () => {
    it('should encrypt and store data in Redis', async () => {
      const key = 'test-key';
      const value = { sensitive: 'data', amount: 1000 };
      const ttl = 3600;
      
      mockRedis.setex.mockResolvedValue('OK');
      
      await service.setEncrypted(key, value, ttl);
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'enc:test-key',
        ttl,
        expect.any(String)
      );
      
      // Verify the stored data is encrypted (not the original value)
      const storedData = mockRedis.setex.mock.calls[0][2];
      expect(storedData).not.toContain('sensitive');
      expect(storedData).not.toContain('1000');
      
      // Verify it's valid JSON with encryption metadata
      const parsed = JSON.parse(storedData);
      expect(parsed).toHaveProperty('ciphertext');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('tag');
      expect(parsed).toHaveProperty('salt');
      expect(parsed).toHaveProperty('algorithm', 'aes-256-gcm');
      expect(parsed).toHaveProperty('keyVersion');
      expect(parsed).toHaveProperty('timestamp');
    });
    
    it('should handle data without TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      
      mockRedis.set.mockResolvedValue('OK');
      
      await service.setEncrypted(key, value);
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'enc:test-key',
        expect.any(String)
      );
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
    
    it('should include metadata when provided', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const metadata = { userId: 'user123', source: 'api' };
      
      mockRedis.set.mockResolvedValue('OK');
      
      await service.setEncrypted(key, value, undefined, metadata);
      
      expect(mockRedis.set).toHaveBeenCalled();
      
      // The metadata should be encrypted along with the data
      const storedData = mockRedis.set.mock.calls[0][1];
      const encrypted = JSON.parse(storedData);
      expect(encrypted.ciphertext).toBeTruthy();
    });
    
    it('should throw error for invalid input', async () => {
      await expect(service.setEncrypted('', { data: 'test' }))
        .rejects.toThrow('Key and value are required');
      
      await expect(service.setEncrypted('key', undefined))
        .rejects.toThrow('Key and value are required');
    });
  });
  
  describe('getEncrypted', () => {
    it('should retrieve and decrypt data from Redis', async () => {
      const key = 'test-key';
      const originalData = { sensitive: 'data', amount: 1000 };
      
      // First, encrypt the data to get a valid encrypted format
      mockRedis.set.mockResolvedValue('OK');
      await service.setEncrypted(key, originalData);
      
      // Get the encrypted data that was stored
      const encryptedData = mockRedis.set.mock.calls[0][1];
      mockRedis.get.mockResolvedValue(encryptedData);
      
      // Now test retrieval
      const decrypted = await service.getEncrypted(key, 'user123');
      
      expect(mockRedis.get).toHaveBeenCalledWith('enc:test-key');
      expect(decrypted).toEqual(originalData);
    });
    
    it('should return null for non-existent keys', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await service.getEncrypted('non-existent');
      
      expect(result).toBeNull();
    });
    
    it('should log security event on decryption failure', async () => {
      const key = 'test-key';
      const invalidEncryptedData = JSON.stringify({
        ciphertext: 'invalid',
        iv: 'invalid',
        tag: 'invalid',
        salt: 'invalid',
        algorithm: 'aes-256-gcm',
        keyVersion: 1,
        timestamp: Date.now()
      });
      
      mockRedis.get.mockResolvedValue(invalidEncryptedData);
      
      const result = await service.getEncrypted(key, 'user123');
      
      expect(result).toBeNull();
      
      // Verify security event was logged
      const { auditLogger } = require('../services/AuditLogger');
      expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'decryption_failed',
        userId: 'user123',
        severity: 'high',
        metadata: expect.objectContaining({
          key,
          error: expect.any(String)
        })
      });
    });
  });
  
  describe('deleteEncrypted', () => {
    it('should delete encrypted data and log the action', async () => {
      const key = 'test-key';
      mockRedis.del.mockResolvedValue(1);
      
      const result = await service.deleteEncrypted(key, 'user123');
      
      expect(mockRedis.del).toHaveBeenCalledWith('enc:test-key');
      expect(result).toBe(true);
      
      // Verify audit logging
      const { auditLogger } = require('../services/AuditLogger');
      expect(auditLogger.logEvent).toHaveBeenCalledWith({
        eventType: 'data_delete',
        userId: 'user123',
        action: 'redis_delete_encrypted',
        resource: {
          type: 'redis_key',
          id: key,
          name: key
        },
        result: 'success'
      });
    });
    
    it('should return false when key does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);
      
      const result = await service.deleteEncrypted('non-existent');
      
      expect(result).toBe(false);
    });
  });
  
  describe('setMultipleEncrypted', () => {
    it('should encrypt and store multiple values in a batch', async () => {
      const items = [
        { key: 'key1', value: { data: 'value1' }, ttl: 3600 },
        { key: 'key2', value: { data: 'value2' } },
        { key: 'key3', value: { data: 'value3' }, ttl: 7200 }
      ];
      
      const pipeline = {
        setex: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      
      mockRedis.pipeline.mockReturnValue(pipeline);
      
      await service.setMultipleEncrypted(items);
      
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(pipeline.setex).toHaveBeenCalledTimes(2); // key1 and key3 have TTL
      expect(pipeline.set).toHaveBeenCalledTimes(1); // key2 has no TTL
      expect(pipeline.exec).toHaveBeenCalled();
      
      // Verify all values are encrypted
      const setexCalls = pipeline.setex.mock.calls;
      const setCalls = pipeline.set.mock.calls;
      
      [...setexCalls, ...setCalls].forEach(call => {
        const encryptedData = call[call.length - 1];
        const parsed = JSON.parse(encryptedData);
        expect(parsed).toHaveProperty('ciphertext');
        expect(parsed).toHaveProperty('iv');
        expect(parsed).toHaveProperty('tag');
      });
    });
  });
  
  describe('encryptExistingData', () => {
    it('should encrypt unencrypted data in Redis', async () => {
      // Mock scan results
      mockRedis.scan
        .mockResolvedValueOnce(['1', ['unencrypted:key1', 'enc:key2', 'unencrypted:key3']])
        .mockResolvedValueOnce(['0', ['unencrypted:key4']]);
      
      // Mock get for unencrypted keys
      mockRedis.get
        .mockResolvedValueOnce('{"data": "value1"}')
        .mockResolvedValueOnce('{"data": "value3"}')
        .mockResolvedValueOnce('plain string value');
      
      // Mock TTL
      mockRedis.ttl
        .mockResolvedValueOnce(3600)
        .mockResolvedValueOnce(-1)
        .mockResolvedValueOnce(7200);
      
      // Mock setex and del
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);
      
      const result = await service.encryptExistingData('unencrypted:*');
      
      expect(result.processed).toBe(3);
      expect(result.errors).toBe(0);
      
      // Verify unencrypted keys were deleted
      expect(mockRedis.del).toHaveBeenCalledTimes(3);
    });
    
    it('should handle errors gracefully during migration', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['bad:key']]);
      
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await service.encryptExistingData('*');
      
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(1);
    });
  });
  
  describe('rotateEncryptionKey', () => {
    it('should rotate encryption key and re-encrypt existing data', async () => {
      // Mock scan for encrypted keys
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['enc:key1', 'enc:key2']]);
      
      // Mock existing encrypted data with old key version
      const oldEncryptedData = JSON.stringify({
        ciphertext: 'old-encrypted',
        iv: 'old-iv',
        tag: 'old-tag',
        salt: 'old-salt',
        algorithm: 'aes-256-gcm',
        keyVersion: 1,
        timestamp: Date.now()
      });
      
      mockRedis.get
        .mockResolvedValueOnce(oldEncryptedData)
        .mockResolvedValueOnce(oldEncryptedData);
      
      mockRedis.set.mockResolvedValue('OK');
      
      // We can't test the actual rotation without the real encryption
      // but we can verify the process
      await expect(service.rotateEncryptionKey()).resolves.not.toThrow();
      
      const { auditLogger } = require('../services/AuditLogger');
      expect(auditLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'config_changed',
          action: 'encryption_key_rotated',
          severity: 'high'
        })
      );
    });
  });
  
  describe('verifyIntegrity', () => {
    it('should verify integrity of encrypted data', async () => {
      // First, store some encrypted data
      mockRedis.set.mockResolvedValue('OK');
      await service.setEncrypted('test-key', { data: 'test' });
      
      const encryptedData = mockRedis.set.mock.calls[0][1];
      
      // Mock scan results
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['enc:test-key']]);
      
      mockRedis.get.mockResolvedValue(encryptedData);
      
      const result = await service.verifyIntegrity();
      
      expect(result.valid).toBeGreaterThan(0);
      expect(result.invalid).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect corrupted data', async () => {
      const corruptedData = JSON.stringify({
        ciphertext: 'corrupted',
        iv: 'corrupted',
        tag: 'corrupted',
        salt: 'corrupted',
        algorithm: 'aes-256-gcm',
        keyVersion: 1,
        timestamp: Date.now()
      });
      
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['enc:corrupted-key']]);
      
      mockRedis.get.mockResolvedValue(corruptedData);
      
      const result = await service.verifyIntegrity();
      
      expect(result.valid).toBe(0);
      expect(result.invalid).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
  
  describe('getStatistics', () => {
    it('should return encryption statistics', async () => {
      mockRedis.eval.mockResolvedValue(42);
      
      const stats = await service.getStatistics();
      
      expect(stats).toHaveProperty('encryptedKeys', 42);
      expect(stats).toHaveProperty('keyVersion');
      expect(stats).toHaveProperty('lastRotation');
      expect(stats).toHaveProperty('nextRotation');
      
      // Next rotation should be in the future
      expect(stats.nextRotation.getTime()).toBeGreaterThan(Date.now());
    });
  });
  
  describe('disconnect', () => {
    it('should disconnect Redis connection', async () => {
      mockRedis.quit.mockResolvedValue('OK');
      
      await service.disconnect();
      
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
  
  describe('SOC 2 Compliance', () => {
    it('should use AES-256-GCM encryption', async () => {
      mockRedis.set.mockResolvedValue('OK');
      
      await service.setEncrypted('test', { data: 'sensitive' });
      
      const storedData = mockRedis.set.mock.calls[0][1];
      const encrypted = JSON.parse(storedData);
      
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.tag).toBeTruthy();
      expect(encrypted.salt).toBeTruthy();
    });
    
    it('should include authentication tag for integrity', async () => {
      mockRedis.set.mockResolvedValue('OK');
      
      await service.setEncrypted('test', { data: 'sensitive' });
      
      const storedData = mockRedis.set.mock.calls[0][1];
      const encrypted = JSON.parse(storedData);
      
      // GCM mode includes authentication tag
      expect(encrypted.tag).toBeTruthy();
      expect(typeof encrypted.tag).toBe('string');
      
      // Tag should be base64 encoded and proper length
      const tagBuffer = Buffer.from(encrypted.tag, 'base64');
      expect(tagBuffer.length).toBe(16); // 128-bit tag
    });
    
    it('should log all data access for audit trail', async () => {
      const { auditLogger } = require('../services/AuditLogger');
      
      // Test set operation
      await service.setEncrypted('key1', { data: 'test' });
      expect(auditLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'data_create',
          action: 'redis_set_encrypted'
        })
      );
      
      // Test get operation
      mockRedis.get.mockResolvedValue(null);
      await service.getEncrypted('key1', 'user123');
      expect(auditLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'data_read',
          userId: 'user123',
          action: 'redis_get_encrypted'
        })
      );
      
      // Test delete operation
      await service.deleteEncrypted('key1', 'user123');
      expect(auditLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'data_delete',
          userId: 'user123',
          action: 'redis_delete_encrypted'
        })
      );
    });
  });
});