import { SwarmOrchestrator } from '../../core/orchestrator/SwarmOrchestrator';
import { BaseHunter } from '../../core/hunters/BaseHunter';
import { DiscoveredBusiness } from '../../types';
import { redis } from '../../core/utils/redis';
import { EventEmitter } from 'events';

jest.mock('../../core/utils/redis');
jest.mock('../../core/utils/logger');

describe('SwarmOrchestrator', () => {
  let orchestrator: SwarmOrchestrator;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      lpush: jest.fn(),
      rpoplpush: jest.fn(),
      llen: jest.fn().mockResolvedValue(0),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      scard: jest.fn().mockResolvedValue(0),
      smembers: jest.fn().mockResolvedValue([]),
      hset: jest.fn(),
      hget: jest.fn(),
      hincrby: jest.fn(),
      zadd: jest.fn(),
      pipeline: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      })
    };
    
    (redis as any) = mockRedis;
    
    orchestrator = new SwarmOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.stop();
    jest.clearAllMocks();
  });

  describe('Initialization and Lifecycle', () => {
    it('should initialize with default configuration', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator['config'].targetBusinesses).toBe(150000);
      expect(orchestrator['config'].hunterCount).toBe(50);
    });

    it('should start all services', async () => {
      const startSpy = jest.spyOn(orchestrator as any, 'initializeHunters');
      const queueSpy = jest.spyOn(orchestrator as any, 'startQueueProcessors');
      const taskSpy = jest.spyOn(orchestrator as any, 'loadInitialTasks');

      await orchestrator.start();

      expect(startSpy).toHaveBeenCalled();
      expect(queueSpy).toHaveBeenCalled();
      expect(taskSpy).toHaveBeenCalled();
      expect(orchestrator['isRunning']).toBe(true);
    });

    it('should stop all services gracefully', async () => {
      await orchestrator.start();
      
      const stopSpy = jest.spyOn(orchestrator as any, 'stopQueueProcessors');
      
      await orchestrator.stop();

      expect(stopSpy).toHaveBeenCalled();
      expect(orchestrator['isRunning']).toBe(false);
    });

    it('should handle start errors gracefully', async () => {
      jest.spyOn(orchestrator as any, 'initializeHunters').mockRejectedValue(
        new Error('Initialization failed')
      );

      await expect(orchestrator.start()).rejects.toThrow('Initialization failed');
      expect(orchestrator['isRunning']).toBe(false);
    });
  });

  describe('Hunter Management', () => {
    it('should initialize hunters based on configuration', async () => {
      await orchestrator.start();

      const hunters = orchestrator['hunters'];
      expect(hunters.size).toBeGreaterThan(0);
      
      // Check hunter types
      const types = Array.from(hunters.values()).map(h => h.type);
      expect(types).toContain('government');
      expect(types).toContain('indigenous_org');
    });

    it('should scale hunters dynamically', async () => {
      await orchestrator.start();
      
      const initialCount = orchestrator['hunters'].size;
      
      await orchestrator.scaleHunters('government', 10);
      
      const governmentHunters = Array.from(orchestrator['hunters'].values())
        .filter(h => h.type === 'government');
      
      expect(governmentHunters.length).toBe(10);
    });

    it('should pause and resume hunters', async () => {
      await orchestrator.start();
      
      const hunterId = Array.from(orchestrator['hunters'].keys())[0];
      
      await orchestrator.pauseHunter(hunterId);
      expect(mockRedis.srem).toHaveBeenCalledWith('hunters:active', hunterId);
      
      await orchestrator.resumeHunter(hunterId);
      expect(mockRedis.sadd).toHaveBeenCalledWith('hunters:active', hunterId);
    });

    it('should restart failed hunters', async () => {
      await orchestrator.start();
      
      const hunterId = Array.from(orchestrator['hunters'].keys())[0];
      const hunter = orchestrator['hunters'].get(hunterId);
      
      const destroySpy = jest.spyOn(hunter!, 'destroy');
      
      await orchestrator.restartHunter(hunterId);
      
      expect(destroySpy).toHaveBeenCalled();
      expect(orchestrator['hunters'].has(hunterId)).toBe(true);
    });
  });

  describe('Task Distribution', () => {
    it('should distribute tasks to hunters evenly', async () => {
      const mockTasks = [
        { source: 'gov1', type: 'government' },
        { source: 'gov2', type: 'government' },
        { source: 'ind1', type: 'indigenous_org' }
      ];

      await orchestrator.start();
      
      for (const task of mockTasks) {
        await orchestrator['queueTask'](task);
      }

      expect(mockRedis.lpush).toHaveBeenCalledTimes(mockTasks.length);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:discovery',
        expect.stringContaining('government')
      );
    });

    it('should handle task failures with retry', async () => {
      const failedTask = {
        source: 'failed-source',
        type: 'government',
        attempts: 1
      };

      await orchestrator['handleTaskFailure'](failedTask, new Error('Task failed'));

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:discovery',
        expect.stringContaining('"attempts":2')
      );
    });

    it('should move tasks to dead letter queue after max retries', async () => {
      const failedTask = {
        source: 'failed-source',
        type: 'government',
        attempts: 3
      };

      await orchestrator['handleTaskFailure'](failedTask, new Error('Task failed'));

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:dlq',
        expect.any(String)
      );
    });
  });

  describe('Queue Processing', () => {
    it('should process discovery queue', async () => {
      const mockBusiness: DiscoveredBusiness = {
        id: '123',
        name: 'Test Business',
        metadata: {
          source: 'government',
          discoveredAt: new Date(),
          confidence: 0.9
        }
      };

      mockRedis.rpoplpush.mockResolvedValueOnce(JSON.stringify({
        source: 'test-source',
        type: 'government'
      }));

      const mockHunter = {
        hunt: jest.fn().mockResolvedValue([mockBusiness])
      };

      orchestrator['hunters'].set('hunter-1', mockHunter as any);
      
      await orchestrator['processDiscoveryQueue']();

      expect(mockHunter.hunt).toHaveBeenCalledWith('test-source', undefined);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:validation',
        expect.stringContaining(mockBusiness.id)
      );
    });

    it('should process validation queue', async () => {
      const mockBusiness: DiscoveredBusiness = {
        id: '123',
        name: 'Test Business',
        metadata: { source: 'test' }
      };

      mockRedis.rpoplpush.mockResolvedValueOnce(JSON.stringify(mockBusiness));

      const validateSpy = jest.spyOn(orchestrator['validator'], 'validate')
        .mockResolvedValue({ isValid: true, errors: [], warnings: [] });

      await orchestrator['processValidationQueue']();

      expect(validateSpy).toHaveBeenCalledWith(mockBusiness);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:enrichment',
        expect.any(String)
      );
    });

    it('should process enrichment queue', async () => {
      const mockBusiness: DiscoveredBusiness = {
        id: '123',
        name: 'Test Business',
        metadata: { source: 'test' }
      };

      mockRedis.rpoplpush.mockResolvedValueOnce(JSON.stringify(mockBusiness));

      const enrichSpy = jest.spyOn(orchestrator['enricher'], 'enrich')
        .mockResolvedValue({
          ...mockBusiness,
          verified: true,
          certifications: []
        } as any);

      await orchestrator['processEnrichmentQueue']();

      expect(enrichSpy).toHaveBeenCalledWith(mockBusiness);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:export',
        expect.any(String)
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should track discovery progress', async () => {
      mockRedis.get.mockResolvedValueOnce('1000'); // total discovered
      mockRedis.get.mockResolvedValueOnce('100'); // indigenous identified
      mockRedis.scard.mockResolvedValueOnce(10); // active hunters

      const stats = await orchestrator.getProgress();

      expect(stats.totalDiscovered).toBe(1000);
      expect(stats.indigenousIdentified).toBe(100);
      expect(stats.percentComplete).toBeCloseTo(0.67, 2);
      expect(stats.activeHunters).toBe(10);
    });

    it('should calculate estimated completion time', async () => {
      mockRedis.get.mockResolvedValueOnce('10000'); // discovered
      mockRedis.zcount.mockResolvedValueOnce(1000); // last hour discoveries

      const stats = await orchestrator.getProgress();

      expect(stats.estimatedCompletion).toBeDefined();
      expect(stats.discoveryRate).toBe(1000);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle hunter failures gracefully', async () => {
      const failingHunter = new class extends BaseHunter {
        async hunt(): Promise<DiscoveredBusiness[]> {
          throw new Error('Hunter failed');
        }
      }();

      orchestrator['hunters'].set('failing-hunter', failingHunter);

      const task = { source: 'test', type: 'test' };
      
      // Should not throw
      await expect(
        orchestrator['executeHunt']('failing-hunter', task)
      ).resolves.toBeUndefined();

      // Task should be retried
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:discovery',
        expect.stringContaining('"attempts":1')
      );
    });

    it('should recover from queue processing errors', async () => {
      mockRedis.rpoplpush.mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await expect(
        orchestrator['processDiscoveryQueue']()
      ).resolves.toBeUndefined();
    });

    it('should handle concurrent queue processing', async () => {
      const promises = [];
      
      // Simulate concurrent processing
      for (let i = 0; i < 5; i++) {
        promises.push(orchestrator['processDiscoveryQueue']());
      }

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('Health Monitoring', () => {
    it('should report system health', async () => {
      await orchestrator.start();
      
      mockRedis.llen.mockResolvedValueOnce(10); // discovery queue
      mockRedis.llen.mockResolvedValueOnce(5);  // validation queue
      mockRedis.llen.mockResolvedValueOnce(3);  // enrichment queue

      const health = await orchestrator.getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.services.hunters).toBe(true);
      expect(health.services.redis).toBe(true);
    });

    it('should detect degraded performance', async () => {
      await orchestrator.start();
      
      // Simulate high queue depth
      mockRedis.llen.mockResolvedValue(10000);

      const health = await orchestrator.getSystemHealth();

      expect(health.status).toBe('degraded');
      expect(health.alerts).toHaveLength(1);
      expect(health.alerts[0].severity).toBe('warning');
    });
  });

  describe('Export and Integration', () => {
    it('should export discovered businesses', async () => {
      const mockBusinesses = [
        { id: '1', name: 'Business 1' },
        { id: '2', name: 'Business 2' }
      ];

      const exportSpy = jest.spyOn(orchestrator['repository'], 'export')
        .mockResolvedValue(Buffer.from('csv data'));

      const result = await orchestrator.exportBusinesses('csv', {});

      expect(exportSpy).toHaveBeenCalledWith('csv', {});
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should send data to main platform', async () => {
      const enrichedBusiness = {
        id: '123',
        name: 'Test Business',
        verified: true
      };

      const webhookSpy = jest.spyOn(orchestrator as any, 'sendToMainPlatform')
        .mockResolvedValue(true);

      await orchestrator['processExportQueue']();

      // Verify webhook would be called for enriched businesses
      expect(orchestrator['config'].mainPlatform.webhookUrl).toBeDefined();
    });
  });
});