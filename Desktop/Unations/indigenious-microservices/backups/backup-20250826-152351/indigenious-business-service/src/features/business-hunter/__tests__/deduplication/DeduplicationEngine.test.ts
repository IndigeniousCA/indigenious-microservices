/**
 * Tests for Intelligent Deduplication Engine
 */

import { DeduplicationEngine } from '../../deduplication/DeduplicationEngine';
import { Redis } from 'ioredis';
import { BusinessType, DiscoveredBusiness } from '../../types';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@tensorflow/tfjs-node');

describe('DeduplicationEngine', () => {
  let engine: DeduplicationEngine;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.keys.mockResolvedValue([]);

    engine = new DeduplicationEngine(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('String Matching Algorithms', () => {
    it('should calculate Levenshtein distance correctly', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Indigenous Tech Solutions',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Indigenous Tech Solution', // Missing 's'
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { threshold: 0.9 }
      );

      // Should find the similar business
      expect(result.duplicates.length).toBeGreaterThan(0);
      expect(result.duplicates[0].score).toBeGreaterThan(0.9);
    });

    it('should handle phonetic matching', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Smith Enterprises',
        type: BusinessType.CANADIAN_GENERAL
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Smythe Enterprises', // Sounds the same
        type: BusinessType.CANADIAN_GENERAL
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { algorithms: ['phonetic'] }
      );

      expect(result.duplicates.length).toBeGreaterThan(0);
    });

    it('should use token-based matching', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'First Nations Construction and Development Inc',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Development and Construction First Nations Inc', // Same tokens, different order
        type: BusinessType.INDIGENOUS_OWNED
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { algorithms: ['token'] }
      );

      expect(result.duplicates.length).toBeGreaterThan(0);
      expect(result.duplicates[0].matchDetails.nameMatch).toBeGreaterThan(0.8);
    });
  });

  describe('Business Number Matching', () => {
    it('should identify exact business number matches', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Company A',
        businessNumber: '123456789RC0001',
        type: BusinessType.CANADIAN_GENERAL
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Company A Ltd', // Different name
        businessNumber: '123456789RC0001', // Same BN
        type: BusinessType.CANADIAN_GENERAL
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { checkFields: ['businessNumber'] }
      );

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].score).toBe(1.0); // Exact match
      expect(result.duplicates[0].confidence).toBe('high');
    });
  });

  describe('Contact Information Matching', () => {
    it('should match by phone number', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Business One',
        phone: '+1 (555) 123-4567',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Different Business Name',
        phone: '5551234567', // Same number, different format
        type: BusinessType.INDIGENOUS_OWNED
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { checkFields: ['phone'] }
      );

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].matchDetails.phoneMatch).toBe(1.0);
    });

    it('should match by email domain', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Tech Corp',
        email: 'info@techcorp.ca',
        type: BusinessType.CANADIAN_GENERAL
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Tech Corporation',
        email: 'contact@techcorp.ca', // Same domain
        type: BusinessType.CANADIAN_GENERAL
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { checkFields: ['email'] }
      );

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].matchDetails.emailMatch).toBeGreaterThan(0.5);
    });

    it('should match by website domain', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Web Business',
        website: 'https://www.example.com',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Web Business Inc',
        website: 'http://example.com/about', // Same domain
        type: BusinessType.INDIGENOUS_OWNED
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { checkFields: ['website'] }
      );

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].matchDetails.websiteMatch).toBe(1.0);
    });
  });

  describe('Address Matching', () => {
    it('should match similar addresses', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Location Business',
        address: {
          street: '123 Main Street',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M5V 3A8'
        },
        type: BusinessType.CANADIAN_GENERAL
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Location Business Ltd',
        address: {
          street: '123 Main St', // Abbreviated
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M5V3A8' // No space
        },
        type: BusinessType.CANADIAN_GENERAL
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { checkFields: ['address'] }
      );

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].matchDetails.addressMatch).toBeGreaterThan(0.9);
    });
  });

  describe('ML-Based Scoring', () => {
    it('should use ML model for complex matching', async () => {
      const tf = require('@tensorflow/tfjs-node');
      
      // Mock TensorFlow model
      const mockModel = {
        predict: jest.fn().mockReturnValue({
          dataSync: () => [0.95] // High similarity score
        })
      };
      
      tf.loadLayersModel.mockResolvedValue(mockModel);

      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Complex Business Name',
        description: 'We provide technology solutions',
        industry: ['Technology', 'Consulting'],
        type: BusinessType.INDIGENOUS_OWNED
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Different Name Entirely',
        description: 'Technology solutions provider',
        industry: ['Consulting', 'Technology'],
        type: BusinessType.INDIGENOUS_OWNED
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness,
        { 
          algorithms: ['ml'],
          deepCheck: true
        }
      );

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].algorithm).toBe('ml');
      expect(result.duplicates[0].score).toBeGreaterThan(0.9);
    });
  });

  describe('Bulk Deduplication', () => {
    it('should deduplicate a batch of businesses', async () => {
      const businesses: Partial<DiscoveredBusiness>[] = [
        {
          id: '1',
          name: 'Duplicate Business',
          email: 'contact@dup.com',
          type: BusinessType.CANADIAN_GENERAL
        },
        {
          id: '2',
          name: 'Duplicate Business Inc', // Similar name
          email: 'info@dup.com', // Same domain
          type: BusinessType.CANADIAN_GENERAL
        },
        {
          id: '3',
          name: 'Unique Business',
          email: 'unique@different.com',
          type: BusinessType.INDIGENOUS_OWNED
        }
      ];

      const result = await engine.deduplicateBatch(
        businesses as DiscoveredBusiness[],
        { autoMerge: false }
      );

      expect(result.totalProcessed).toBe(3);
      expect(result.duplicatesFound).toBeGreaterThan(0);
      expect(result.uniqueBusinesses).toBe(2); // Two unique after dedup
      expect(result.groups.length).toBe(2); // Two groups
    });

    it('should auto-merge when configured', async () => {
      const businesses: Partial<DiscoveredBusiness>[] = [
        {
          id: '1',
          name: 'Business to Merge',
          email: 'contact@merge.com',
          phone: '555-1234',
          type: BusinessType.INDIGENOUS_OWNED
        },
        {
          id: '2',
          name: 'Business to Merge Inc',
          website: 'https://merge.com', // Additional info
          description: 'We do business', // Additional info
          type: BusinessType.INDIGENOUS_OWNED
        }
      ];

      const result = await engine.deduplicateBatch(
        businesses as DiscoveredBusiness[],
        { 
          autoMerge: true,
          mergeStrategy: 'comprehensive'
        }
      );

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].email).toBe('contact@merge.com');
      expect(result.merged[0].website).toBe('https://merge.com');
      expect(result.merged[0].description).toBe('We do business');
    });
  });

  describe('Merge Strategies', () => {
    it('should merge businesses preserving primary data', async () => {
      const primary: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Primary Business Name',
        email: 'primary@example.com',
        phone: '555-0001',
        verified: true,
        type: BusinessType.INDIGENOUS_OWNED
      };

      const duplicate: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Secondary Business Name',
        email: 'secondary@example.com',
        website: 'https://example.com', // Additional data
        description: 'Business description', // Additional data
        verified: false,
        type: BusinessType.INDIGENOUS_OWNED
      };

      const merged = await engine.mergeBusinesses(
        primary as DiscoveredBusiness,
        [duplicate as DiscoveredBusiness],
        { preservePrimary: true }
      );

      expect(merged.name).toBe('Primary Business Name'); // Preserved
      expect(merged.email).toBe('primary@example.com'); // Preserved
      expect(merged.website).toBe('https://example.com'); // Added
      expect(merged.description).toBe('Business description'); // Added
    });

    it('should merge using quality-based strategy', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Business',
        email: 'info@',  // Invalid
        confidence: 0.6,
        type: BusinessType.CANADIAN_GENERAL
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: 'Business Corporation Ltd', // More complete
        email: 'info@business.com', // Valid
        confidence: 0.9,
        type: BusinessType.CANADIAN_GENERAL
      };

      const merged = await engine.mergeBusinesses(
        business1 as DiscoveredBusiness,
        [business2 as DiscoveredBusiness],
        { strategy: 'quality' }
      );

      expect(merged.name).toBe('Business Corporation Ltd'); // Better quality
      expect(merged.email).toBe('info@business.com'); // Valid email
      expect(merged.confidence).toBe(0.9); // Higher confidence
    });
  });

  describe('Performance', () => {
    it('should handle large-scale deduplication efficiently', async () => {
      const businesses = Array(1000).fill(null).map((_, i) => ({
        id: `business-${i}`,
        name: `Business ${i % 100}`, // Create some duplicates
        email: `contact${i % 100}@example.com`,
        type: i % 2 === 0 ? BusinessType.INDIGENOUS_OWNED : BusinessType.CANADIAN_GENERAL
      }));

      const startTime = Date.now();
      const result = await engine.deduplicateBatch(
        businesses as DiscoveredBusiness[],
        { 
          threshold: 0.8,
          batchSize: 100
        }
      );
      const duration = Date.now() - startTime;

      expect(result.totalProcessed).toBe(1000);
      expect(result.uniqueBusinesses).toBeLessThan(1000); // Found duplicates
      expect(duration).toBeLessThan(5000); // Under 5 seconds
    });
  });

  describe('Edge Cases', () => {
    it('should handle businesses with minimal information', async () => {
      const minimal: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Minimal Business',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.findDuplicates(
        minimal as DiscoveredBusiness
      );

      expect(result.duplicates).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('should handle special characters in names', async () => {
      const business1: Partial<DiscoveredBusiness> = {
        id: '1',
        name: "L'Entreprise Française & Co.",
        type: BusinessType.CANADIAN_GENERAL
      };

      const business2: Partial<DiscoveredBusiness> = {
        id: '2',
        name: "L'Entreprise Francaise and Co", // Different special chars
        type: BusinessType.CANADIAN_GENERAL
      };

      mockRedis.keys.mockResolvedValue(['business:2']);
      mockRedis.get.mockResolvedValue(JSON.stringify(business2));

      const result = await engine.findDuplicates(
        business1 as DiscoveredBusiness
      );

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].score).toBeGreaterThan(0.8);
    });

    it('should handle different business type suffixes', async () => {
      const variations = [
        'ABC Company',
        'ABC Company Inc',
        'ABC Company Inc.',
        'ABC Company Incorporated',
        'ABC Company Ltd',
        'ABC Company Limited',
        'ABC Company Corp',
        'ABC Company Corporation'
      ];

      const results = await Promise.all(
        variations.slice(1).map(async (name) => {
          const business: Partial<DiscoveredBusiness> = {
            id: '1',
            name: variations[0],
            type: BusinessType.CANADIAN_GENERAL
          };

          const variant: Partial<DiscoveredBusiness> = {
            id: '2',
            name,
            type: BusinessType.CANADIAN_GENERAL
          };

          mockRedis.keys.mockResolvedValue(['business:2']);
          mockRedis.get.mockResolvedValue(JSON.stringify(variant));

          return engine.findDuplicates(business as DiscoveredBusiness);
        })
      );

      results.forEach(result => {
        expect(result.duplicates.length).toBe(1);
        expect(result.duplicates[0].score).toBeGreaterThan(0.85);
      });
    });
  });

  describe('Configuration Options', () => {
    it('should respect field-specific thresholds', async () => {
      const business: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Test Business',
        email: 'test@example.com',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.findDuplicates(
        business as DiscoveredBusiness,
        {
          fieldThresholds: {
            name: 0.95,    // Very strict
            email: 0.5,    // Loose
            phone: 0.8     // Medium
          }
        }
      );

      expect(result.config.fieldThresholds).toBeDefined();
    });

    it('should use custom comparison functions', async () => {
      const customCompare = jest.fn().mockReturnValue(0.99);

      const business: Partial<DiscoveredBusiness> = {
        id: '1',
        name: 'Custom Compare Business',
        type: BusinessType.CANADIAN_GENERAL
      };

      const result = await engine.findDuplicates(
        business as DiscoveredBusiness,
        {
          customComparators: {
            name: customCompare
          }
        }
      );

      expect(customCompare).toHaveBeenCalled();
    });
  });
});