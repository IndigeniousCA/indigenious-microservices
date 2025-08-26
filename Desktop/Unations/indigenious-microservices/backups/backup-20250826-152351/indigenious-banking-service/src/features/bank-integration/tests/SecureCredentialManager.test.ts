/**
 * Secure Credential Manager Tests
 * SOC 2 Type II Compliance Testing
 */

import { SecureCredentialManager, secureCredentialManager } from '../services/SecureCredentialManager';
import { 
  SecretsManagerClient, 
  GetSecretValueCommand, 
  CreateSecretCommand, 
  UpdateSecretCommand 
} from '@aws-sdk/client-secrets-manager';
import crypto from 'crypto';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({
    send: jest.fn()
  })),
  GetSecretValueCommand: jest.fn(),
  CreateSecretCommand: jest.fn(),
  UpdateSecretCommand: jest.fn()
}));

// Mock logger
jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock audit logger
jest.mock('../services/AuditLogger', () => ({
  auditLogger: {
    logEvent: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

describe('SecureCredentialManager', () => {
  let mockSecretsClient: any;
  const mockLogger = require('@/lib/monitoring/logger').logger;
  const mockAuditLogger = require('../services/AuditLogger').auditLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (SecureCredentialManager as any).instance = undefined;
    
    // Setup AWS mocks
    mockSecretsClient = {
      send: jest.fn()
    };
    (SecretsManagerClient as jest.Mock).mockImplementation(() => mockSecretsClient);
    
    // Reset cache
    const manager = SecureCredentialManager.getInstance();
    (manager as any).cache.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecureCredentialManager.getInstance();
      const instance2 = SecureCredentialManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('storeBankCredentials', () => {
    it('should encrypt and store bank credentials', async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        environment: 'sandbox' as const
      };

      mockSecretsClient.send.mockResolvedValue({});

      await secureCredentialManager.storeBankCredentials('scotia', credentials);

      expect(mockSecretsClient.send).toHaveBeenCalled();
      const command = mockSecretsClient.send.mock.calls[0][0];
      
      // Verify it's an update or create command
      expect(command).toBeInstanceOf(UpdateSecretCommand);
      
      // Verify encryption happened (secret should not be plaintext)
      const secretData = JSON.parse(command.input.SecretString);
      expect(secretData.encrypted).toBe(true);
      expect(secretData.data).not.toContain('test-secret');
      expect(secretData.iv).toBeDefined();
      expect(secretData.tag).toBeDefined();
    });

    it('should create new secret if it does not exist', async () => {
      mockSecretsClient.send
        .mockRejectedValueOnce({ name: 'ResourceNotFoundException' })
        .mockResolvedValueOnce({});

      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        environment: 'production' as const
      };

      await secureCredentialManager.storeBankCredentials('rbc', credentials);

      expect(mockSecretsClient.send).toHaveBeenCalledTimes(2);
      expect(mockSecretsClient.send.mock.calls[1][0]).toBeInstanceOf(CreateSecretCommand);
    });

    it('should audit credential storage', async () => {
      await secureCredentialManager.storeBankCredentials('td', {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        environment: 'sandbox' as const
      });

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'credentials_stored',
        action: 'store_bank_credentials',
        severity: 'high',
        metadata: {
          bankId: 'td',
          credentialType: 'bank',
          environment: 'sandbox'
        }
      });
    });

    it('should validate bank ID', async () => {
      await expect(
        secureCredentialManager.storeBankCredentials('invalid-bank' as any, {})
      ).rejects.toThrow('Invalid bank ID');
    });
  });

  describe('getBankCredentials', () => {
    it('should retrieve and decrypt bank credentials', async () => {
      const encryptedData = {
        encrypted: true,
        data: 'encrypted-data',
        iv: 'test-iv',
        tag: 'test-tag'
      };

      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify(encryptedData)
      });

      // Mock decryption
      jest.spyOn(secureCredentialManager as any, 'decrypt')
        .mockReturnValue(JSON.stringify({
          clientId: 'test-client-id',
          clientSecret: 'test-secret'
        }));

      const result = await secureCredentialManager.getBankCredentials('scotia');

      expect(result).toEqual({
        clientId: 'test-client-id',
        clientSecret: 'test-secret'
      });

      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.any(GetSecretValueCommand)
      );
    });

    it('should use cache for subsequent requests', async () => {
      const credentials = {
        clientId: 'cached-id',
        clientSecret: 'cached-secret'
      };

      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          encrypted: true,
          data: 'encrypted'
        })
      });

      jest.spyOn(secureCredentialManager as any, 'decrypt')
        .mockReturnValue(JSON.stringify(credentials));

      // First call - should hit AWS
      await secureCredentialManager.getBankCredentials('bmo');
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const cached = await secureCredentialManager.getBankCredentials('bmo');
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(1);
      expect(cached).toEqual(credentials);
    });

    it('should handle missing credentials', async () => {
      mockSecretsClient.send.mockRejectedValue({
        name: 'ResourceNotFoundException'
      });

      const result = await secureCredentialManager.getBankCredentials('cibc');
      expect(result).toBeNull();
    });

    it('should refresh cache when expired', async () => {
      // Set cache with expired entry
      const cache = (secureCredentialManager as any).cache;
      cache.set('bank:desjardins', {
        credentials: { old: 'data' },
        expires: Date.now() - 1000 // Expired
      });

      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          encrypted: true,
          data: 'new-encrypted'
        })
      });

      jest.spyOn(secureCredentialManager as any, 'decrypt')
        .mockReturnValue(JSON.stringify({ new: 'credentials' }));

      const result = await secureCredentialManager.getBankCredentials('desjardins');

      expect(result).toEqual({ new: 'credentials' });
      expect(mockSecretsClient.send).toHaveBeenCalled();
    });
  });

  describe('generateAPIKey', () => {
    it('should generate secure API key with prefix', () => {
      const apiKey = secureCredentialManager.generateAPIKey('test');
      
      expect(apiKey).toMatch(/^test_[a-zA-Z0-9]{32}$/);
      expect(apiKey.length).toBe(37); // prefix (4) + underscore (1) + key (32)
    });

    it('should generate unique keys', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(secureCredentialManager.generateAPIKey('test'));
      }
      expect(keys.size).toBe(100);
    });
  });

  describe('validateAPIKey', () => {
    it('should validate correct API key format', async () => {
      const validKey = 'indi_abcdef1234567890abcdef1234567890';
      const result = await secureCredentialManager.validateAPIKey(validKey);
      
      expect(result).toEqual({
        valid: true,
        prefix: 'indi'
      });
    });

    it('should reject invalid formats', async () => {
      const invalidKeys = [
        'invalid-format',
        'short_key',
        'toolong_1234567890123456789012345678901234567890',
        'no-underscore-1234567890123456789012345678'
      ];

      for (const key of invalidKeys) {
        const result = await secureCredentialManager.validateAPIKey(key);
        expect(result.valid).toBe(false);
      }
    });

    it('should audit API key validation', async () => {
      await secureCredentialManager.validateAPIKey('test_key123');

      expect(mockAuditLogger.logEvent).toHaveBeenCalledWith({
        eventType: 'data_read',
        action: 'validate_api_key',
        metadata: {
          keyPrefix: 'test',
          valid: false
        }
      });
    });
  });

  describe('storeUserSecret', () => {
    it('should store encrypted user secrets', async () => {
      mockSecretsClient.send.mockResolvedValue({});

      await secureCredentialManager.storeUserSecret(
        'user123',
        'totp_secret',
        'JBSWY3DPEHPK3PXP'
      );

      expect(mockSecretsClient.send).toHaveBeenCalled();
      const command = mockSecretsClient.send.mock.calls[0][0];
      
      expect(command.input.SecretId).toBe('indigenous-platform/user/user123/totp_secret');
      
      const secretData = JSON.parse(command.input.SecretString);
      expect(secretData.encrypted).toBe(true);
      expect(secretData.data).not.toContain('JBSWY3DPEHPK3PXP');
    });

    it('should enforce key naming validation', async () => {
      await expect(
        secureCredentialManager.storeUserSecret('user123', 'invalid key!', 'secret')
      ).rejects.toThrow('Invalid key format');

      await expect(
        secureCredentialManager.storeUserSecret('user123', '../../../etc/passwd', 'secret')
      ).rejects.toThrow('Invalid key format');
    });
  });

  describe('getUserSecret', () => {
    it('should retrieve and decrypt user secrets', async () => {
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          encrypted: true,
          data: 'encrypted-secret',
          iv: 'iv',
          tag: 'tag'
        })
      });

      jest.spyOn(secureCredentialManager as any, 'decrypt')
        .mockReturnValue('DECRYPTED_SECRET');

      const result = await secureCredentialManager.getUserSecret('user123', 'totp_secret');

      expect(result).toBe('DECRYPTED_SECRET');
      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            SecretId: 'indigenous-platform/user/user123/totp_secret'
          }
        })
      );
    });
  });

  describe('rotateEncryptionKey', () => {
    it('should rotate encryption key and re-encrypt secrets', async () => {
      // Mock list of secrets
      mockSecretsClient.send.mockImplementation((command) => {
        if (command.constructor.name === 'ListSecretsCommand') {
          return {
            SecretList: [
              { Name: 'indigenous-platform/bank/scotia' },
              { Name: 'indigenous-platform/user/user123/totp' }
            ]
          };
        }
        return {};
      });

      await secureCredentialManager.rotateEncryptionKey();

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'key_rotation',
        action: 'rotate_encryption_key',
        severity: 'critical',
        metadata: {
          secretsRotated: 2
        }
      });
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const manager = SecureCredentialManager.getInstance();
      const testData = JSON.stringify({
        sensitive: 'data',
        apiKey: 'secret-key-123'
      });

      const encrypted = (manager as any).encrypt(testData);
      
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted.data).not.toBe(testData);

      const decrypted = (manager as any).decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should use AES-256-GCM encryption', () => {
      const manager = SecureCredentialManager.getInstance();
      const config = (manager as any).ENCRYPTION_CONFIG;

      expect(config.algorithm).toBe('aes-256-gcm');
      expect(config.keyLength).toBe(32);
      expect(config.ivLength).toBe(16);
      expect(config.tagLength).toBe(16);
    });

    it('should generate unique IVs for each encryption', () => {
      const manager = SecureCredentialManager.getInstance();
      const testData = 'same data';

      const encrypted1 = (manager as any).encrypt(testData);
      const encrypted2 = (manager as any).encrypt(testData);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });
  });

  describe('Cache Management', () => {
    it('should respect cache TTL', async () => {
      const manager = SecureCredentialManager.getInstance();
      const cache = (manager as any).cache;
      
      // Set cache entry
      cache.set('test:key', {
        credentials: { test: 'data' },
        expires: Date.now() + 300000 // 5 minutes
      });

      // Should find valid cache
      expect(cache.has('test:key')).toBe(true);
      
      // Set expired entry
      cache.set('test:expired', {
        credentials: { test: 'data' },
        expires: Date.now() - 1000
      });

      // Should detect expired
      const expired = cache.get('test:expired');
      expect(Date.now() > expired.expires).toBe(true);
    });

    it('should clear cache on clearCache()', () => {
      const manager = SecureCredentialManager.getInstance();
      const cache = (manager as any).cache;
      
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      
      expect(cache.size).toBe(2);
      
      manager.clearCache();
      
      expect(cache.size).toBe(0);
    });
  });

  describe('SOC 2 Compliance', () => {
    it('should audit all credential operations', async () => {
      // Store operation
      await secureCredentialManager.storeBankCredentials('scotia', {
        clientId: 'test',
        clientSecret: 'secret',
        environment: 'sandbox' as const
      });

      // Retrieve operation
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({ encrypted: true, data: 'test' })
      });
      await secureCredentialManager.getBankCredentials('scotia');

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledTimes(2);
      expect(mockAuditLogger.logEvent).toHaveBeenCalled();
    });

    it('should use proper AWS region configuration', () => {
      expect(SecretsManagerClient).toHaveBeenCalledWith({
        region: process.env.AWS_REGION || 'ca-central-1'
      });
    });

    it('should validate encryption key on initialization', () => {
      const manager = SecureCredentialManager.getInstance();
      const key = (manager as any).encryptionKey;
      
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 256 bits
    });

    it('should handle AWS errors gracefully', async () => {
      mockSecretsClient.send.mockRejectedValue(new Error('AWS Error'));

      await expect(
        secureCredentialManager.storeBankCredentials('scotia', {
          clientId: 'test',
          clientSecret: 'secret',
          environment: 'sandbox' as const
        })
      ).rejects.toThrow('Failed to store bank credentials');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});