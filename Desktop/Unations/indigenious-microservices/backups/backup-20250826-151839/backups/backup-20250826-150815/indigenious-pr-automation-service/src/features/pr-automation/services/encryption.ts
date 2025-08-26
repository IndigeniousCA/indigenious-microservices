import crypto from 'crypto';
import { logger } from '@/lib/monitoring/logger';

export class EncryptionService {
  private static instance: EncryptionService;
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  private saltLength = 32;
  
  private constructor() {
    // Get key from environment or generate a secure one
    const keyString = process.env.PR_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
    
    if (!keyString) {
      throw new Error('Encryption key not found in environment variables');
    }
    
    // Ensure key is 32 bytes for AES-256
    this.key = this.deriveKey(keyString);
  }
  
  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }
  
  private deriveKey(password: string): Buffer {
    // Use PBKDF2 to derive a key from the password
    const salt = crypto.createHash('sha256').update('pr-automation-salt').digest();
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }
  
  encrypt(text: string): { encrypted: string; iv: string; tag: string; salt: string } {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  decrypt(encrypted: string, iv: string, tag: string, salt?: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  // Encrypt sensitive object fields
  encryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): T & { _encryption?: Record<string, any> } {
    const encrypted = { ...obj } as T & { _encryption?: Record<string, any> };
    const encryptionMeta: Record<string, any> = {};
    
    for (const field of fieldsToEncrypt) {
      if (obj[field] !== undefined && obj[field] !== null) {
        const value = typeof obj[field] === 'string' 
          ? obj[field] 
          : JSON.stringify(obj[field]);
          
        const encryptedData = this.encrypt(value);
        encrypted[field] = encryptedData.encrypted as any;
        encryptionMeta[field as string] = {
          iv: encryptedData.iv,
          tag: encryptedData.tag,
          salt: encryptedData.salt
        };
      }
    }
    
    encrypted._encryption = encryptionMeta;
    return encrypted;
  }
  
  // Decrypt sensitive object fields
  decryptObject<T extends Record<string, any>>(
    obj: T & { _encryption?: Record<string, any> }
  ): T {
    if (!obj._encryption) {
      return obj;
    }
    
    const decrypted = { ...obj };
    delete decrypted._encryption;
    
    for (const [field, meta] of Object.entries(obj._encryption)) {
      if (decrypted[field] && meta.iv && meta.tag) {
        try {
          const decryptedValue = this.decrypt(
            decrypted[field],
            meta.iv,
            meta.tag,
            meta.salt
          );
          
          // Try to parse as JSON, fallback to string
          try {
            decrypted[field] = JSON.parse(decryptedValue);
          } catch {
            decrypted[field] = decryptedValue;
          }
        } catch (error) {
          logger.error(`Failed to decrypt field ${field}:`, error);
          // Leave field encrypted on error
        }
      }
    }
    
    return decrypted;
  }
  
  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Hash sensitive data (one-way)
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Compare hashed values (timing-safe)
  compareHash(data: string, hash: string): boolean {
    const dataHash = this.hash(data);
    return crypto.timingSafeEqual(
      Buffer.from(dataHash),
      Buffer.from(hash)
    );
  }
  
  // Encrypt API keys and credentials
  encryptCredentials(credentials: Record<string, string>): string {
    const jsonStr = JSON.stringify(credentials);
    const { encrypted, iv, tag, salt } = this.encrypt(jsonStr);
    
    // Combine all parts into a single string
    return Buffer.from(JSON.stringify({
      e: encrypted,
      i: iv,
      t: tag,
      s: salt
    })).toString('base64');
  }
  
  // Decrypt API keys and credentials
  decryptCredentials(encryptedCredentials: string): Record<string, string> {
    try {
      const { e, i, t, s } = JSON.parse(
        Buffer.from(encryptedCredentials, 'base64').toString()
      );
      
      const decrypted = this.decrypt(e, i, t, s);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt credentials:', error);
      throw new Error('Invalid encrypted credentials');
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();