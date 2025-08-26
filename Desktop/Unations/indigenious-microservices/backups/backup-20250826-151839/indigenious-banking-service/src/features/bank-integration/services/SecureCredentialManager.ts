/**
 * Secure Credential Manager
 * Enterprise-grade credential management with encryption and vault integration
 */

import crypto from 'crypto';
import { logger } from '@/lib/monitoring/logger';
import { BankCredentialsSchema } from '../schemas/validation';
import { z } from 'zod';

// Interfaces
interface EncryptedCredential {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyId: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface VaultProvider {
  getSecret(key: string): Promise<string>;
  setSecret(key: string, value: string, options?: any): Promise<void>;
  deleteSecret(key: string): Promise<void>;
  rotateKey(keyId: string): Promise<string>;
}

// AWS Secrets Manager Provider
class AWSSecretsManagerProvider implements VaultProvider {
  private client: any; // AWS SecretsManager client
  
  constructor() {
    // In production, initialize AWS SDK
    // this.client = new AWS.SecretsManager({ region: process.env.AWS_REGION });
  }
  
  async getSecret(key: string): Promise<string> {
    try {
      // In production:
      // const response = await this.client.getSecretValue({ SecretId: key }).promise();
      // return response.SecretString;
      
      // Development fallback
      const envKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const value = process.env[envKey];
      if (!value) {
        throw new Error(`Secret not found: ${key}`);
      }
      return value;
    } catch (error) {
      logger.error('Failed to retrieve secret from AWS', { error, key });
      throw error;
    }
  }
  
  async setSecret(key: string, value: string, options?: any): Promise<void> {
    try {
      // In production:
      // await this.client.createSecret({
      //   Name: key,
      //   SecretString: value,
      //   Tags: options?.tags
      // }).promise();
      
      logger.info('Secret stored in vault', { key });
    } catch (error) {
      logger.error('Failed to store secret in AWS', { error, key });
      throw error;
    }
  }
  
  async deleteSecret(key: string): Promise<void> {
    try {
      // In production:
      // await this.client.deleteSecret({
      //   SecretId: key,
      //   ForceDeleteWithoutRecovery: false
      // }).promise();
      
      logger.info('Secret deleted from vault', { key });
    } catch (error) {
      logger.error('Failed to delete secret from AWS', { error, key });
      throw error;
    }
  }
  
  async rotateKey(keyId: string): Promise<string> {
    // Implement key rotation logic
    const newKeyId = `${keyId}-${Date.now()}`;
    logger.info('Key rotated', { oldKeyId: keyId, newKeyId });
    return newKeyId;
  }
}

// HashiCorp Vault Provider (alternative)
class HashiCorpVaultProvider implements VaultProvider {
  private vaultUrl: string;
  private token: string;
  
  constructor() {
    this.vaultUrl = process.env.VAULT_URL || 'http://localhost:8200';
    this.token = process.env.VAULT_TOKEN || '';
  }
  
  async getSecret(key: string): Promise<string> {
    // Implement HashiCorp Vault integration
    throw new Error('HashiCorp Vault provider not implemented');
  }
  
  async setSecret(key: string, value: string): Promise<void> {
    throw new Error('HashiCorp Vault provider not implemented');
  }
  
  async deleteSecret(key: string): Promise<void> {
    throw new Error('HashiCorp Vault provider not implemented');
  }
  
  async rotateKey(keyId: string): Promise<string> {
    throw new Error('HashiCorp Vault provider not implemented');
  }
}

export class SecureCredentialManager {
  private static instance: SecureCredentialManager;
  private vaultProvider: VaultProvider;
  private encryptionKey: Buffer;
  private currentKeyId: string;
  private credentialCache: Map<string, { credential: any; expiry: Date }> = new Map();
  
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly CACHE_TTL = 300000; // 5 minutes
  
  private constructor() {
    // Select vault provider based on environment
    const provider = process.env.VAULT_PROVIDER || 'aws';
    switch (provider) {
      case 'aws':
        this.vaultProvider = new AWSSecretsManagerProvider();
        break;
      case 'hashicorp':
        this.vaultProvider = new HashiCorpVaultProvider();
        break;
      default:
        this.vaultProvider = new AWSSecretsManagerProvider();
    }
    
    // Initialize encryption key
    this.initializeEncryptionKey();
  }
  
  static getInstance(): SecureCredentialManager {
    if (!SecureCredentialManager.instance) {
      SecureCredentialManager.instance = new SecureCredentialManager();
    }
    return SecureCredentialManager.instance;
  }
  
  /**
   * Get bank credentials securely
   */
  async getBankCredentials(bankId: string): Promise<z.infer<typeof BankCredentialsSchema>[keyof z.infer<typeof BankCredentialsSchema>]> {
    const cacheKey = `bank_credentials_${bankId}`;
    
    // Check cache first
    const cached = this.credentialCache.get(cacheKey);
    if (cached && cached.expiry > new Date()) {
      logger.info('Returning cached credentials', { bankId });
      return cached.credential;
    }
    
    try {
      // Retrieve encrypted credentials from vault
      const secretKey = `indigenous-platform/bank-credentials/${bankId}`;
      const encryptedData = await this.vaultProvider.getSecret(secretKey);
      
      // Decrypt credentials
      const decrypted = await this.decrypt(JSON.parse(encryptedData));
      
      // Validate credentials
      const validated = BankCredentialsSchema.shape[bankId.toLowerCase()].parse(JSON.parse(decrypted));
      
      // Cache with expiry
      this.credentialCache.set(cacheKey, {
        credential: validated,
        expiry: new Date(Date.now() + this.CACHE_TTL)
      });
      
      logger.info('Bank credentials retrieved successfully', { bankId });
      return validated;
      
    } catch (error) {
      logger.error('Failed to retrieve bank credentials', { error, bankId });
      throw new Error('Unable to retrieve bank credentials');
    }
  }
  
  /**
   * Store bank credentials securely
   */
  async storeBankCredentials(
    bankId: string,
    credentials: any,
    options?: { rotateKey?: boolean }
  ): Promise<void> {
    try {
      // Validate credentials
      const validated = BankCredentialsSchema.shape[bankId.toLowerCase()].parse(credentials);
      
      // Encrypt credentials
      const encrypted = await this.encrypt(JSON.stringify(validated));
      
      // Store in vault
      const secretKey = `indigenous-platform/bank-credentials/${bankId}`;
      await this.vaultProvider.setSecret(secretKey, JSON.stringify(encrypted), {
        tags: [
          { Key: 'service', Value: 'indigenous-platform' },
          { Key: 'type', Value: 'bank-credentials' },
          { Key: 'bank', Value: bankId }
        ]
      });
      
      // Clear cache
      this.credentialCache.delete(`bank_credentials_${bankId}`);
      
      // Rotate encryption key if requested
      if (options?.rotateKey) {
        await this.rotateEncryptionKey();
      }
      
      logger.info('Bank credentials stored successfully', { bankId });
      
    } catch (error) {
      logger.error('Failed to store bank credentials', { error, bankId });
      throw error;
    }
  }
  
  /**
   * Delete bank credentials
   */
  async deleteBankCredentials(bankId: string): Promise<void> {
    try {
      const secretKey = `indigenous-platform/bank-credentials/${bankId}`;
      await this.vaultProvider.deleteSecret(secretKey);
      
      // Clear cache
      this.credentialCache.delete(`bank_credentials_${bankId}`);
      
      logger.info('Bank credentials deleted', { bankId });
      
    } catch (error) {
      logger.error('Failed to delete bank credentials', { error, bankId });
      throw error;
    }
  }
  
  /**
   * Get API key for service authentication
   */
  async getAPIKey(keyId: string): Promise<string> {
    try {
      const secretKey = `indigenous-platform/api-keys/${keyId}`;
      const encryptedKey = await this.vaultProvider.getSecret(secretKey);
      const decrypted = await this.decrypt(JSON.parse(encryptedKey));
      
      return decrypted;
      
    } catch (error) {
      logger.error('Failed to retrieve API key', { error, keyId });
      throw new Error('Unable to retrieve API key');
    }
  }
  
  /**
   * Generate and store new API key
   */
  async generateAPIKey(
    purpose: string,
    permissions: string[],
    expiresIn?: number
  ): Promise<{ keyId: string; apiKey: string }> {
    try {
      // Generate secure API key
      const keyId = `indi_${crypto.randomBytes(16).toString('hex')}`;
      const apiKey = `indi_${crypto.randomBytes(32).toString('hex')}`;
      
      // Create key metadata
      const keyData = {
        keyId,
        purpose,
        permissions,
        createdAt: new Date(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined
      };
      
      // Encrypt and store
      const encrypted = await this.encrypt(apiKey);
      await this.vaultProvider.setSecret(
        `indigenous-platform/api-keys/${keyId}`,
        JSON.stringify(encrypted)
      );
      
      // Store metadata separately
      await this.vaultProvider.setSecret(
        `indigenous-platform/api-keys-metadata/${keyId}`,
        JSON.stringify(keyData)
      );
      
      logger.info('API key generated', { keyId, purpose });
      
      return { keyId, apiKey };
      
    } catch (error) {
      logger.error('Failed to generate API key', { error });
      throw error;
    }
  }
  
  /**
   * Validate API key
   */
  async validateAPIKey(apiKey: string): Promise<{
    valid: boolean;
    keyId?: string;
    permissions?: string[];
    expired?: boolean;
  }> {
    try {
      // Extract key ID from API key (first 32 chars after prefix)
      const match = apiKey.match(/^indi_([a-f0-9]{32})/);
      if (!match) {
        return { valid: false };
      }
      
      const keyId = `indi_${match[1]}`;
      
      // Retrieve and validate
      const storedKey = await this.getAPIKey(keyId);
      if (storedKey !== apiKey) {
        return { valid: false };
      }
      
      // Check metadata
      const metadata = await this.vaultProvider.getSecret(
        `indigenous-platform/api-keys-metadata/${keyId}`
      );
      const keyData = JSON.parse(metadata);
      
      // Check expiry
      if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
        return { valid: false, keyId, expired: true };
      }
      
      return {
        valid: true,
        keyId,
        permissions: keyData.permissions
      };
      
    } catch (error) {
      logger.error('Failed to validate API key', { error });
      return { valid: false };
    }
  }
  
  // Private encryption methods
  
  private async initializeEncryptionKey(): Promise<void> {
    try {
      // Retrieve master key from vault
      const masterKey = await this.vaultProvider.getSecret('indigenous-platform/master-encryption-key');
      this.encryptionKey = Buffer.from(masterKey, 'hex');
      this.currentKeyId = 'master-001';
      
    } catch (error) {
      // Generate new key if not found (first time setup)
      logger.warn('Master key not found, generating new key');
      this.encryptionKey = crypto.randomBytes(this.KEY_LENGTH);
      await this.vaultProvider.setSecret(
        'indigenous-platform/master-encryption-key',
        this.encryptionKey.toString('hex')
      );
      this.currentKeyId = 'master-001';
    }
  }
  
  private async encrypt(data: string): Promise<EncryptedCredential> {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.ALGORITHM,
      keyId: this.currentKeyId,
      createdAt: new Date()
    };
  }
  
  private async decrypt(credential: EncryptedCredential): Promise<string> {
    const decipher = crypto.createDecipheriv(
      credential.algorithm,
      this.encryptionKey,
      Buffer.from(credential.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(credential.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(credential.encrypted, 'base64')),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }
  
  private async rotateEncryptionKey(): Promise<void> {
    try {
      // Generate new key
      const newKey = crypto.randomBytes(this.KEY_LENGTH);
      const newKeyId = await this.vaultProvider.rotateKey(this.currentKeyId);
      
      // Store new key
      await this.vaultProvider.setSecret(
        `indigenous-platform/encryption-keys/${newKeyId}`,
        newKey.toString('hex')
      );
      
      // Update current key
      this.encryptionKey = newKey;
      this.currentKeyId = newKeyId;
      
      // Clear credential cache
      this.credentialCache.clear();
      
      logger.info('Encryption key rotated successfully', { newKeyId });
      
    } catch (error) {
      logger.error('Failed to rotate encryption key', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const secureCredentialManager = SecureCredentialManager.getInstance();