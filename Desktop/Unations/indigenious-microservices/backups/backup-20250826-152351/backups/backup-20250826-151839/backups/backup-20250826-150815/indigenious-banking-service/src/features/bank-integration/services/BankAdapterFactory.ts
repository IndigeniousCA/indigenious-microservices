/**
 * Bank Adapter Factory
 * Central factory for managing all bank adapters
 * Implements singleton pattern for efficient resource usage
 */

import { BankAdapter, BankId, BankCredentials } from '../types';
import { ScotiaTranXactAdapter } from '../adapters/scotia/ScotiaTranXactAdapter';
import { secureCredentialManager } from './SecureCredentialManager';
import { logger } from '@/lib/monitoring/logger';

// Import placeholders for other bank adapters (to be implemented)
// import { RBCAdapter } from '../adapters/rbc/RBCAdapter';
// import { TDAdapter } from '../adapters/td/TDAdapter';
// import { BMOAdapter } from '../adapters/bmo/BMOAdapter';
// import { CIBCAdapter } from '../adapters/cibc/CIBCAdapter';
// import { DesjardinsAdapter } from '../adapters/desjardins/DesjardinsAdapter';

export class BankAdapterFactory {
  private static instance: BankAdapterFactory;
  private adapters: Map<BankId, BankAdapter> = new Map();
  private credentials: BankCredentials;
  private initialized = false;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  static getInstance(): BankAdapterFactory {
    if (!BankAdapterFactory.instance) {
      BankAdapterFactory.instance = new BankAdapterFactory();
    }
    return BankAdapterFactory.instance;
  }
  
  /**
   * Initialize the factory with bank credentials
   */
  async initialize(credentials: BankCredentials): Promise<void> {
    if (this.initialized) {
      logger.warn('BankAdapterFactory already initialized');
      return;
    }
    
    this.credentials = credentials;
    
    try {
      // Store credentials securely first
      for (const [bankId, bankCredentials] of Object.entries(credentials)) {
        if (bankCredentials) {
          await secureCredentialManager.storeBankCredentials(
            bankId.toUpperCase(),
            bankCredentials
          );
        }
      }
      
      // Initialize Scotia adapter if credentials provided
      if (credentials.scotia) {
        const scotiaAdapter = new ScotiaTranXactAdapter(
          credentials.scotia.environment
        );
        await scotiaAdapter.connect();
        this.adapters.set('SCOTIA', scotiaAdapter);
        logger.info('Scotia adapter initialized successfully');
      }
      
      // Initialize RBC adapter if credentials provided
      if (credentials.rbc) {
        // const rbcAdapter = new RBCAdapter(
        //   credentials.rbc.certificatePath,
        //   credentials.rbc.privateKeyPath,
        //   credentials.rbc.passphrase,
        //   credentials.rbc.environment
        // );
        // await rbcAdapter.connect();
        // this.adapters.set('RBC', rbcAdapter);
        logger.info('RBC adapter initialization pending implementation');
      }
      
      // Initialize TD adapter if credentials provided
      if (credentials.td) {
        // const tdAdapter = new TDAdapter(
        //   credentials.td.apiKey,
        //   credentials.td.apiSecret,
        //   credentials.td.environment
        // );
        // await tdAdapter.connect();
        // this.adapters.set('TD', tdAdapter);
        logger.info('TD adapter initialization pending implementation');
      }
      
      // Initialize BMO adapter if credentials provided
      if (credentials.bmo) {
        // const bmoAdapter = new BMOAdapter(
        //   credentials.bmo.username,
        //   credentials.bmo.password,
        //   credentials.bmo.clientId,
        //   credentials.bmo.environment
        // );
        // await bmoAdapter.connect();
        // this.adapters.set('BMO', bmoAdapter);
        logger.info('BMO adapter initialization pending implementation');
      }
      
      // Initialize CIBC adapter if credentials provided
      if (credentials.cibc) {
        // const cibcAdapter = new CIBCAdapter(
        //   credentials.cibc.apiKey,
        //   credentials.cibc.partnerId,
        //   credentials.cibc.environment
        // );
        // await cibcAdapter.connect();
        // this.adapters.set('CIBC', cibcAdapter);
        logger.info('CIBC adapter initialization pending implementation');
      }
      
      // Initialize Desjardins adapter if credentials provided
      if (credentials.desjardins) {
        // const desjardinsAdapter = new DesjardinsAdapter(
        //   credentials.desjardins.clientId,
        //   credentials.desjardins.certificatePath,
        //   credentials.desjardins.environment
        // );
        // await desjardinsAdapter.connect();
        // this.adapters.set('DESJARDINS', desjardinsAdapter);
        logger.info('Desjardins adapter initialization pending implementation');
      }
      
      this.initialized = true;
      logger.info(`BankAdapterFactory initialized with ${this.adapters.size} bank adapters`);
      
    } catch (error) {
      logger.error('Failed to initialize BankAdapterFactory', { error });
      throw new Error(`BankAdapterFactory initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Get an adapter for a specific bank
   */
  getAdapter(bankId: BankId): BankAdapter {
    if (!this.initialized) {
      throw new Error('BankAdapterFactory not initialized. Call initialize() first.');
    }
    
    const adapter = this.adapters.get(bankId);
    if (!adapter) {
      throw new Error(`No adapter found for bank: ${bankId}. Ensure credentials are provided during initialization.`);
    }
    
    return adapter;
  }
  
  /**
   * Get all available bank adapters
   */
  getAvailableAdapters(): Map<BankId, BankAdapter> {
    if (!this.initialized) {
      throw new Error('BankAdapterFactory not initialized. Call initialize() first.');
    }
    
    return new Map(this.adapters);
  }
  
  /**
   * Get list of available banks
   */
  getAvailableBanks(): BankId[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Check if a specific bank adapter is available
   */
  hasAdapter(bankId: BankId): boolean {
    return this.adapters.has(bankId);
  }
  
  /**
   * Perform health check on all adapters
   */
  async healthCheckAll(): Promise<Map<BankId, boolean>> {
    const results = new Map<BankId, boolean>();
    
    for (const [bankId, adapter] of this.adapters) {
      try {
        const health = await adapter.healthCheck();
        results.set(bankId, health.status === 'healthy');
      } catch (error) {
        logger.error(`Health check failed for ${bankId}`, { error });
        results.set(bankId, false);
      }
    }
    
    return results;
  }
  
  /**
   * Gracefully disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];
    
    for (const [bankId, adapter] of this.adapters) {
      disconnectPromises.push(
        adapter.disconnect()
          .then(() => logger.info(`${bankId} adapter disconnected`))
          .catch(error => logger.error(`Failed to disconnect ${bankId} adapter`, { error }))
      );
    }
    
    await Promise.all(disconnectPromises);
    this.adapters.clear();
    this.initialized = false;
    
    logger.info('All bank adapters disconnected');
  }
  
  /**
   * Reload a specific bank adapter (useful for credential updates)
   */
  async reloadAdapter(bankId: BankId): Promise<void> {
    if (!this.credentials[bankId.toLowerCase()]) {
      throw new Error(`No credentials found for ${bankId}`);
    }
    
    // Disconnect existing adapter if present
    const existingAdapter = this.adapters.get(bankId);
    if (existingAdapter) {
      await existingAdapter.disconnect();
      this.adapters.delete(bankId);
    }
    
    // Reinitialize the specific adapter
    switch (bankId) {
      case 'SCOTIA':
        if (this.credentials.scotia) {
          const scotiaAdapter = new ScotiaTranXactAdapter(
            this.credentials.scotia.clientId,
            this.credentials.scotia.clientSecret,
            this.credentials.scotia.environment
          );
          await scotiaAdapter.connect();
          this.adapters.set('SCOTIA', scotiaAdapter);
        }
        break;
      
      // Add cases for other banks as their adapters are implemented
      
      default:
        throw new Error(`Adapter reload not implemented for ${bankId}`);
    }
    
    logger.info(`${bankId} adapter reloaded successfully`);
  }
}

// Export singleton instance
export const bankAdapterFactory = BankAdapterFactory.getInstance();