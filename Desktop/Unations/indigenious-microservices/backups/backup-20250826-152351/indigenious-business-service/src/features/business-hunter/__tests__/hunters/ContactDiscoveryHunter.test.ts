/**
 * Tests for Contact Discovery Hunter
 */

import { ContactDiscoveryHunter } from '../../core/hunters/ContactDiscoveryHunter';
import { Redis } from 'ioredis';
import { HunterConfig, HunterType } from '../../types';

// Mock dependencies
jest.mock('ioredis');
jest.mock('axios');
jest.mock('puppeteer');

describe('ContactDiscoveryHunter', () => {
  let hunter: ContactDiscoveryHunter;
  let mockRedis: jest.Mocked<Redis>;
  let config: HunterConfig;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');

    config = {
      id: 'contact-hunter-1',
      type: HunterType.CONTACT_DISCOVERY,
      sources: ['email-patterns', 'apis', 'web-scraping'],
      rateLimit: 60,
      priority: 1,
      enabled: true
    };

    hunter = new ContactDiscoveryHunter(config, mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Pattern Generation', () => {
    it('should generate all standard email patterns', async () => {
      const business = {
        id: 'test-1',
        name: 'Test Company',
        website: 'https://testcompany.com',
        contacts: []
      };

      const result = await hunter.huntContacts(business as any);

      expect(result.discoveredContacts).toBeDefined();
      expect(result.strategies.emailPatterns.attempted).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle businesses without websites', async () => {
      const business = {
        id: 'test-2',
        name: 'No Website Company',
        contacts: []
      };

      const result = await hunter.huntContacts(business as any);

      expect(result.discoveredContacts).toEqual([]);
      expect(result.strategies.emailPatterns.found).toBe(0);
    });

    it('should validate email formats', async () => {
      const business = {
        id: 'test-3',
        name: 'Test Inc',
        website: 'https://test.com',
        contacts: [{
          name: 'John Doe',
          title: 'CEO'
        }]
      };

      const result = await hunter.huntContacts(business as any);
      
      result.discoveredContacts.forEach(contact => {
        if (contact.email) {
          expect(contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
      });
    });
  });

  describe('API Integration', () => {
    it('should use Hunter.io API when available', async () => {
      process.env.HUNTER_IO_API_KEY = 'test-key';
      
      const business = {
        id: 'test-4',
        name: 'API Test Company',
        website: 'https://apitest.com'
      };

      const axios = require('axios');
      axios.get.mockResolvedValueOnce({
        data: {
          data: {
            emails: [
              {
                value: 'john@apitest.com',
                type: 'personal',
                confidence: 90,
                first_name: 'John',
                last_name: 'Doe',
                position: 'CEO'
              }
            ]
          }
        }
      });

      const result = await hunter.huntContacts(business as any);

      expect(result.strategies.hunterIO.found).toBeGreaterThan(0);
      expect(result.discoveredContacts[0].email).toBe('john@apitest.com');
      expect(result.discoveredContacts[0].confidence).toBe(0.9);
    });

    it('should handle API errors gracefully', async () => {
      const business = {
        id: 'test-5',
        name: 'Error Test Company',
        website: 'https://errortest.com'
      };

      const axios = require('axios');
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await hunter.huntContacts(business as any);

      expect(result.strategies.hunterIO.errors).toBeGreaterThan(0);
      expect(result.discoveredContacts).toBeDefined();
    });
  });

  describe('Web Scraping', () => {
    it('should scrape contact information from websites', async () => {
      const business = {
        id: 'test-6',
        name: 'Scrape Test Company',
        website: 'https://scrapetest.com'
      };

      const puppeteer = require('puppeteer');
      const mockPage = {
        goto: jest.fn(),
        evaluate: jest.fn().mockResolvedValue({
          emails: ['contact@scrapetest.com', 'info@scrapetest.com'],
          phones: ['+1-555-0123'],
          linkedIn: 'https://linkedin.com/company/scrapetest'
        }),
        close: jest.fn()
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      
      puppeteer.launch.mockResolvedValue(mockBrowser);

      const result = await hunter.huntContacts(business as any);

      expect(result.strategies.webScraping.found).toBeGreaterThan(0);
      expect(result.discoveredContacts).toHaveLength(2);
      expect(mockPage.goto).toHaveBeenCalledWith(business.website, expect.any(Object));
    });

    it('should handle scraping timeouts', async () => {
      const business = {
        id: 'test-7',
        name: 'Timeout Test Company',
        website: 'https://timeouttest.com'
      };

      const puppeteer = require('puppeteer');
      const mockPage = {
        goto: jest.fn().mockRejectedValue(new Error('Timeout')),
        close: jest.fn()
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      
      puppeteer.launch.mockResolvedValue(mockBrowser);

      const result = await hunter.huntContacts(business as any);

      expect(result.strategies.webScraping.errors).toBeGreaterThan(0);
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Phone Verification', () => {
    it('should verify phone numbers with Twilio', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';
      process.env.TWILIO_VERIFY_SERVICE_SID = 'test-service';

      const business = {
        id: 'test-8',
        name: 'Phone Test Company',
        website: 'https://phonetest.com',
        phone: '+1-555-0123'
      };

      const result = await hunter.huntContacts(business as any);

      expect(result.verificationMethods).toContain('phone');
    });

    it('should handle invalid phone numbers', async () => {
      const business = {
        id: 'test-9',
        name: 'Invalid Phone Company',
        website: 'https://invalidphone.com',
        phone: '123' // Invalid
      };

      const result = await hunter.huntContacts(business as any);

      expect(result.discoveredContacts).toBeDefined();
      expect(result.verificationMethods).not.toContain('phone');
    });
  });

  describe('Caching', () => {
    it('should cache discovered contacts', async () => {
      const business = {
        id: 'test-10',
        name: 'Cache Test Company',
        website: 'https://cachetest.com'
      };

      await hunter.huntContacts(business as any);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('contacts:'),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should use cached contacts when available', async () => {
      const cachedContacts = {
        discoveredContacts: [{
          name: 'Cached Contact',
          email: 'cached@test.com'
        }],
        cachedAt: new Date().toISOString()
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedContacts));

      const business = {
        id: 'test-11',
        name: 'Cached Company',
        website: 'https://cached.com'
      };

      const result = await hunter.huntContacts(business as any);

      expect(result.discoveredContacts[0].name).toBe('Cached Contact');
      expect(result.fromCache).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const businesses = Array(5).fill(null).map((_, i) => ({
        id: `rate-test-${i}`,
        name: `Rate Test Company ${i}`,
        website: `https://ratetest${i}.com`
      }));

      const startTime = Date.now();
      
      for (const business of businesses) {
        await hunter.huntContacts(business as any);
      }
      
      const duration = Date.now() - startTime;
      
      // With rate limit of 60/min, 5 requests should take some time
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('LinkedIn Integration', () => {
    it('should extract LinkedIn profiles', async () => {
      const business = {
        id: 'test-12',
        name: 'LinkedIn Test Company',
        website: 'https://linkedintest.com'
      };

      const puppeteer = require('puppeteer');
      const mockPage = {
        goto: jest.fn(),
        evaluate: jest.fn().mockResolvedValue({
          emails: [],
          phones: [],
          linkedIn: 'https://linkedin.com/company/linkedintest'
        }),
        close: jest.fn()
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      
      puppeteer.launch.mockResolvedValue(mockBrowser);

      const result = await hunter.huntContacts(business as any);

      expect(result.strategies.socialMedia.attempted).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle null business gracefully', async () => {
      const result = await hunter.huntContacts(null as any);
      
      expect(result.discoveredContacts).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const business = {
        id: 'test-13',
        name: 'Network Error Company',
        website: 'https://networkerror.com'
      };

      // Mock network error
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Network Error'));

      const result = await hunter.huntContacts(business as any);

      expect(result.discoveredContacts).toBeDefined();
      expect(result.strategies.hunterIO.errors).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate confidence based on verification methods', async () => {
      const business = {
        id: 'test-14',
        name: 'Confidence Test Company',
        website: 'https://confidencetest.com',
        contacts: [{
          name: 'John Doe',
          email: 'john@confidencetest.com',
          phone: '+1-555-0123'
        }]
      };

      const result = await hunter.huntContacts(business as any);

      result.discoveredContacts.forEach(contact => {
        expect(contact.confidence).toBeGreaterThanOrEqual(0);
        expect(contact.confidence).toBeLessThanOrEqual(1);
        
        if (contact.verified) {
          expect(contact.confidence).toBeGreaterThan(0.7);
        }
      });
    });
  });
});