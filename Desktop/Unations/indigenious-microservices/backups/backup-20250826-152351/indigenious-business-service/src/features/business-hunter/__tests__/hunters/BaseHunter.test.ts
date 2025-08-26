import { BaseHunter } from '../../core/hunters/BaseHunter';
import { DiscoveredBusiness } from '../../types';
import { CircuitBreaker } from '../../core/utils/CircuitBreaker';
import { RateLimiter } from '../../core/utils/RateLimiter';

// Create a concrete implementation for testing
class TestHunter extends BaseHunter {
  async hunt(source: string, options?: any): Promise<DiscoveredBusiness[]> {
    await this.rateLimiter.check();
    return [];
  }
}

describe('BaseHunter', () => {
  let hunter: TestHunter;

  beforeEach(() => {
    hunter = new TestHunter();
    jest.clearAllMocks();
  });

  afterEach(() => {
    hunter.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(hunter).toBeDefined();
      expect(hunter['config'].rateLimit).toBe(60);
      expect(hunter['config'].timeout).toBe(30000);
      expect(hunter['config'].retryAttempts).toBe(3);
    });

    it('should initialize with custom configuration', () => {
      const customHunter = new TestHunter({
        name: 'CustomHunter',
        type: 'custom',
        config: {
          rateLimit: 30,
          timeout: 10000,
          retryAttempts: 5,
          retryDelay: 2000
        }
      });

      expect(customHunter['config'].rateLimit).toBe(30);
      expect(customHunter['config'].timeout).toBe(10000);
      expect(customHunter['config'].retryAttempts).toBe(5);
      
      customHunter.destroy();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];
      
      // Make requests up to the rate limit
      for (let i = 0; i < 60; i++) {
        requests.push(hunter.hunt('test'));
      }

      await Promise.all(requests);

      // Next request should be rate limited
      await expect(hunter.hunt('test')).rejects.toThrow('Rate limit exceeded');
    });

    it('should reset rate limit after window', async () => {
      jest.useFakeTimers();

      // Exhaust rate limit
      const requests = [];
      for (let i = 0; i < 60; i++) {
        requests.push(hunter.hunt('test'));
      }
      await Promise.all(requests);

      // Should be rate limited
      await expect(hunter.hunt('test')).rejects.toThrow('Rate limit exceeded');

      // Advance time past rate limit window
      jest.advanceTimersByTime(60000);

      // Should work again
      await expect(hunter.hunt('test')).resolves.toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after consecutive failures', async () => {
      const failingHunter = new class extends TestHunter {
        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          throw new Error('Service unavailable');
        }
      }();

      // Make requests that will fail
      for (let i = 0; i < 5; i++) {
        try {
          await failingHunter.hunt('test');
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open
      await expect(failingHunter.hunt('test')).rejects.toThrow('Circuit breaker is OPEN');
      
      failingHunter.destroy();
    });

    it('should close circuit after recovery', async () => {
      jest.useFakeTimers();
      let shouldFail = true;

      const recoveringHunter = new class extends TestHunter {
        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          if (shouldFail) {
            throw new Error('Service unavailable');
          }
          return [];
        }
      }();

      // Cause circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await recoveringHunter.hunt('test');
        } catch (error) {
          // Expected
        }
      }

      // Circuit is open
      await expect(recoveringHunter.hunt('test')).rejects.toThrow('Circuit breaker is OPEN');

      // Fix the service
      shouldFail = false;

      // Wait for half-open state
      jest.advanceTimersByTime(30000);

      // Should succeed and close circuit
      await expect(recoveringHunter.hunt('test')).resolves.toBeDefined();

      jest.useRealTimers();
      recoveringHunter.destroy();
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests to same source', async () => {
      let callCount = 0;
      
      const countingHunter = new class extends TestHunter {
        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          callCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
          return [{ id: '1', name: 'Test Business' } as DiscoveredBusiness];
        }
      }();

      // Make multiple concurrent requests to same source
      const results = await Promise.all([
        countingHunter.hunt('same-source'),
        countingHunter.hunt('same-source'),
        countingHunter.hunt('same-source')
      ]);

      // Should only make one actual request
      expect(callCount).toBe(1);
      
      // All should get same result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      
      countingHunter.destroy();
    });

    it('should not deduplicate requests to different sources', async () => {
      let callCount = 0;
      
      const countingHunter = new class extends TestHunter {
        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          callCount++;
          return [];
        }
      }();

      await Promise.all([
        countingHunter.hunt('source1'),
        countingHunter.hunt('source2'),
        countingHunter.hunt('source3')
      ]);

      expect(callCount).toBe(3);
      
      countingHunter.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should retry on transient errors', async () => {
      let attempts = 0;
      
      const retryingHunter = new class extends TestHunter {
        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary error');
          }
          return [];
        }
      }();

      const result = await retryingHunter.hunt('test');
      
      expect(attempts).toBe(3);
      expect(result).toEqual([]);
      
      retryingHunter.destroy();
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      
      const nonRetryingHunter = new class extends TestHunter {
        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          attempts++;
          const error = new Error('Bad request');
          (error as any).code = 400;
          throw error;
        }
      }();

      await expect(nonRetryingHunter.hunt('test')).rejects.toThrow('Bad request');
      expect(attempts).toBe(1);
      
      nonRetryingHunter.destroy();
    });
  });

  describe('Proxy Management', () => {
    it('should rotate proxies on request', async () => {
      const proxies = ['proxy1', 'proxy2', 'proxy3'];
      let usedProxies: string[] = [];

      const proxyHunter = new class extends TestHunter {
        constructor() {
          super({
            name: 'ProxyHunter',
            type: 'test',
            config: {
              proxies,
              useProxy: true
            }
          });
        }

        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          const proxy = this['getNextProxy']();
          usedProxies.push(proxy);
          return [];
        }
      }();

      // Make multiple requests
      for (let i = 0; i < 6; i++) {
        await proxyHunter.hunt('test');
      }

      // Should have used all proxies in rotation
      expect(usedProxies).toEqual(['proxy1', 'proxy2', 'proxy3', 'proxy1', 'proxy2', 'proxy3']);
      
      proxyHunter.destroy();
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should emit success metrics', async () => {
      const successHandler = jest.fn();
      hunter.on('hunt:success', successHandler);

      await hunter.hunt('test');

      expect(successHandler).toHaveBeenCalledWith({
        source: 'test',
        count: 0,
        duration: expect.any(Number)
      });
    });

    it('should emit error metrics', async () => {
      const errorHandler = jest.fn();
      
      const failingHunter = new class extends TestHunter {
        async hunt(source: string): Promise<DiscoveredBusiness[]> {
          throw new Error('Hunt failed');
        }
      }();

      failingHunter.on('hunt:error', errorHandler);

      try {
        await failingHunter.hunt('test');
      } catch (error) {
        // Expected
      }

      expect(errorHandler).toHaveBeenCalledWith({
        source: 'test',
        error: expect.any(Error),
        duration: expect.any(Number)
      });
      
      failingHunter.destroy();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const cleanupSpy = jest.spyOn(hunter['rateLimiter'], 'reset');
      
      hunter.destroy();
      
      expect(cleanupSpy).toHaveBeenCalled();
      expect(hunter['destroyed']).toBe(true);
    });

    it('should reject requests after destroy', async () => {
      hunter.destroy();
      
      await expect(hunter.hunt('test')).rejects.toThrow('Hunter has been destroyed');
    });
  });
});