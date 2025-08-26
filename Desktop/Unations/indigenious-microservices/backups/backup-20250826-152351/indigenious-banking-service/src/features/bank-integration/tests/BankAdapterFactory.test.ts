/**
 * Bank Adapter Factory Tests
 */

import { BankAdapterFactory, bankAdapterFactory } from '../services/BankAdapterFactory';
import { ScotiaTranXactAdapter } from '../adapters/scotia/ScotiaTranXactAdapter';
import { BankCredentials } from '../types';

// Mock dependencies
jest.mock('../adapters/scotia/ScotiaTranXactAdapter', () => ({
  ScotiaTranXactAdapter: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
  }))
}));

jest.mock('../services/SecureCredentialManager', () => ({
  secureCredentialManager: {
    storeBankCredentials: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('BankAdapterFactory', () => {
  const mockLogger = require('@/lib/monitoring/logger').logger;
  const mockCredentialManager = require('../services/SecureCredentialManager').secureCredentialManager;
  
  const mockCredentials: BankCredentials = {
    scotia: {
      clientId: 'scotia-client',
      clientSecret: 'scotia-secret',
      environment: 'sandbox'
    },
    rbc: {
      certificatePath: '/path/to/cert',
      privateKeyPath: '/path/to/key',
      passphrase: 'test-pass',
      environment: 'sandbox'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (BankAdapterFactory as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BankAdapterFactory.getInstance();
      const instance2 = BankAdapterFactory.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize with bank credentials', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      // Should store credentials securely
      expect(mockCredentialManager.storeBankCredentials).toHaveBeenCalledWith(
        'SCOTIA',
        mockCredentials.scotia
      );
      expect(mockCredentialManager.storeBankCredentials).toHaveBeenCalledWith(
        'RBC',
        mockCredentials.rbc
      );

      // Should create Scotia adapter
      expect(ScotiaTranXactAdapter).toHaveBeenCalledWith('sandbox');
      
      // Should log initialization
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Scotia adapter initialized')
      );
    });

    it('should handle partial credentials', async () => {
      const factory = BankAdapterFactory.getInstance();
      const partialCredentials: BankCredentials = {
        scotia: mockCredentials.scotia
      };

      await factory.initialize(partialCredentials);

      expect(mockCredentialManager.storeBankCredentials).toHaveBeenCalledTimes(1);
      expect(factory.getAvailableBanks()).toEqual(['SCOTIA']);
    });

    it('should warn on re-initialization', async () => {
      const factory = BankAdapterFactory.getInstance();
      
      await factory.initialize(mockCredentials);
      await factory.initialize(mockCredentials);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'BankAdapterFactory already initialized'
      );
    });

    it('should handle initialization errors', async () => {
      const factory = BankAdapterFactory.getInstance();
      const error = new Error('Connection failed');
      
      (ScotiaTranXactAdapter as jest.Mock).mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(error)
      }));

      await expect(factory.initialize(mockCredentials))
        .rejects.toThrow('BankAdapterFactory initialization failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getAdapter', () => {
    it('should return initialized adapter', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      const adapter = factory.getAdapter('SCOTIA');
      expect(adapter).toBeDefined();
      expect(adapter.connect).toBeDefined();
    });

    it('should throw if not initialized', () => {
      const factory = BankAdapterFactory.getInstance();
      
      expect(() => factory.getAdapter('SCOTIA'))
        .toThrow('BankAdapterFactory not initialized');
    });

    it('should throw for unknown bank', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      expect(() => factory.getAdapter('UNKNOWN' as any))
        .toThrow('No adapter found for bank: UNKNOWN');
    });
  });

  describe('getAvailableAdapters', () => {
    it('should return map of available adapters', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      const adapters = factory.getAvailableAdapters();
      
      expect(adapters).toBeInstanceOf(Map);
      expect(adapters.size).toBe(1);
      expect(adapters.has('SCOTIA')).toBe(true);
    });

    it('should return copy of adapters map', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      const adapters1 = factory.getAvailableAdapters();
      const adapters2 = factory.getAvailableAdapters();
      
      expect(adapters1).not.toBe(adapters2);
      expect(adapters1.size).toBe(adapters2.size);
    });
  });

  describe('hasAdapter', () => {
    it('should check adapter availability', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      expect(factory.hasAdapter('SCOTIA')).toBe(true);
      expect(factory.hasAdapter('TD')).toBe(false);
    });
  });

  describe('healthCheckAll', () => {
    it('should perform health check on all adapters', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      const results = await factory.healthCheckAll();

      expect(results).toBeInstanceOf(Map);
      expect(results.get('SCOTIA')).toBe(true);
    });

    it('should handle health check failures', async () => {
      const factory = BankAdapterFactory.getInstance();
      
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        healthCheck: jest.fn().mockRejectedValue(new Error('Health check failed'))
      };
      
      (ScotiaTranXactAdapter as jest.Mock).mockImplementationOnce(() => mockAdapter);
      
      await factory.initialize(mockCredentials);
      const results = await factory.healthCheckAll();

      expect(results.get('SCOTIA')).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed for SCOTIA',
        expect.any(Object)
      );
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all adapters', async () => {
      const factory = BankAdapterFactory.getInstance();
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined)
      };
      
      (ScotiaTranXactAdapter as jest.Mock).mockImplementation(() => mockAdapter);
      
      await factory.initialize(mockCredentials);
      await factory.disconnectAll();

      expect(mockAdapter.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('SCOTIA adapter disconnected');
      expect(mockLogger.info).toHaveBeenCalledWith('All bank adapters disconnected');
      
      // Should clear adapters
      expect(() => factory.getAdapter('SCOTIA'))
        .toThrow('BankAdapterFactory not initialized');
    });

    it('should handle disconnect errors gracefully', async () => {
      const factory = BankAdapterFactory.getInstance();
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockRejectedValue(new Error('Disconnect failed'))
      };
      
      (ScotiaTranXactAdapter as jest.Mock).mockImplementation(() => mockAdapter);
      
      await factory.initialize(mockCredentials);
      await factory.disconnectAll();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to disconnect SCOTIA adapter',
        expect.any(Object)
      );
    });
  });

  describe('reloadAdapter', () => {
    it('should reload specific adapter', async () => {
      const factory = BankAdapterFactory.getInstance();
      const mockAdapter1 = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined)
      };
      const mockAdapter2 = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined)
      };
      
      (ScotiaTranXactAdapter as jest.Mock)
        .mockImplementationOnce(() => mockAdapter1)
        .mockImplementationOnce(() => mockAdapter2);
      
      await factory.initialize(mockCredentials);
      await factory.reloadAdapter('SCOTIA');

      expect(mockAdapter1.disconnect).toHaveBeenCalled();
      expect(mockAdapter2.connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SCOTIA adapter reloaded successfully'
      );
    });

    it('should throw for unknown adapter', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      await expect(factory.reloadAdapter('UNKNOWN' as any))
        .rejects.toThrow('No credentials found for UNKNOWN');
    });

    it('should throw for unimplemented adapters', async () => {
      const factory = BankAdapterFactory.getInstance();
      await factory.initialize(mockCredentials);

      await expect(factory.reloadAdapter('RBC'))
        .rejects.toThrow('Adapter reload not implemented for RBC');
    });
  });

  describe('Pending Implementations', () => {
    it('should log pending implementation for other banks', async () => {
      const factory = BankAdapterFactory.getInstance();
      const fullCredentials: BankCredentials = {
        scotia: mockCredentials.scotia,
        rbc: mockCredentials.rbc,
        td: {
          apiKey: 'td-key',
          apiSecret: 'td-secret',
          environment: 'sandbox'
        },
        bmo: {
          username: 'bmo-user',
          password: 'bmo-pass',
          clientId: 'bmo-client',
          environment: 'sandbox'
        },
        cibc: {
          apiKey: 'cibc-key',
          partnerId: 'cibc-partner',
          environment: 'sandbox'
        },
        desjardins: {
          clientId: 'desj-client',
          certificatePath: '/path/to/cert',
          environment: 'sandbox'
        }
      };

      await factory.initialize(fullCredentials);

      const pendingBanks = ['RBC', 'TD', 'BMO', 'CIBC', 'Desjardins'];
      pendingBanks.forEach(bank => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          `${bank} adapter initialization pending implementation`
        );
      });
    });
  });
});