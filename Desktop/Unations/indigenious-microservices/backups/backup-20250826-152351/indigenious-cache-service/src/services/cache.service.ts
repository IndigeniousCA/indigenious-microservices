import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { createClient } from 'redis';
import Bull from 'bull';
import { LRUCache } from 'lru-cache';
import NodeCache from 'node-cache';
import * as msgpack from 'msgpack-lite';
import { compress, uncompress } from 'snappy';
import murmurhash from 'murmurhash';
import { v4 as uuidv4 } from 'uuid';
import { differenceInSeconds } from 'date-fns';
import CircuitBreaker from 'opossum';
import pRetry from 'p-retry';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Multi-tier cache architecture
export class CacheService {
  private redisClient: Redis;
  private redisCluster: Redis.Cluster | null = null;
  private redisSentinel: any = null;
  private memoryCache: LRUCache<string, any>;
  private nodeCache: NodeCache;
  private circuitBreaker: CircuitBreaker;
  
  // Cache configuration
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly MAX_MEMORY = 1024 * 1024 * 1024; // 1GB
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  
  // Indigenous data sovereignty
  private readonly DATA_LOCATION = 'CANADA';
  private readonly INDIGENOUS_NAMESPACE = 'indigenous';
  
  constructor() {
    // Initialize Redis
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    });
    
    // Initialize memory cache (L1)
    this.memoryCache = new LRUCache({
      max: 10000, // Max items
      maxSize: 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      ttl: 60 * 1000, // 1 minute default
      updateAgeOnGet: true,
      updateAgeOnHas: false
    });
    
    // Initialize node-cache (L2)
    this.nodeCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false,
      deleteOnExpire: true
    });
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.getCacheWithFallback.bind(this),
      {
        timeout: 3000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      }
    );
    
    // Setup cluster if configured
    if (process.env.REDIS_CLUSTER_NODES) {
      this.setupCluster();
    }
    
    // Setup sentinel if configured
    if (process.env.REDIS_SENTINEL_NODES) {
      this.setupSentinel();
    }
  }
  
  // Multi-tier get with fallback
  async get(key: string, options: any = {}): Promise<any> {
    const namespace = options.namespace || 'default';
    const fullKey = this.buildKey(namespace, key);
    
    try {
      // L1: Memory cache
      const memoryValue = this.memoryCache.get(fullKey);
      if (memoryValue !== undefined) {
        await this.trackAccess(fullKey, 'MEMORY_HIT');
        return memoryValue;
      }
      
      // L2: Node cache
      const nodeValue = this.nodeCache.get(fullKey);
      if (nodeValue !== undefined) {
        this.memoryCache.set(fullKey, nodeValue);
        await this.trackAccess(fullKey, 'NODE_CACHE_HIT');
        return nodeValue;
      }
      
      // L3: Redis
      const redisValue = await this.getFromRedis(fullKey);
      if (redisValue !== null) {
        const decoded = await this.decodeValue(redisValue);
        
        // Populate upper caches
        this.nodeCache.set(fullKey, decoded);
        this.memoryCache.set(fullKey, decoded);
        
        await this.trackAccess(fullKey, 'REDIS_HIT');
        return decoded;
      }
      
      // L4: Database (if configured)
      if (options.fallbackToDb) {
        const dbValue = await this.getFromDatabase(key, namespace);
        if (dbValue) {
          await this.set(key, dbValue, options);
          return dbValue;
        }
      }
      
      await this.trackAccess(fullKey, 'MISS');
      return null;
    } catch (error) {
      console.error(`Cache get error for ${fullKey}:`, error);
      
      // Circuit breaker fallback
      if (options.useFallback) {
        return this.circuitBreaker.fire(fullKey);
      }
      
      throw error;
    }
  }
  
  // Multi-tier set with compression
  async set(key: string, value: any, options: any = {}): Promise<boolean> {
    const namespace = options.namespace || 'default';
    const fullKey = this.buildKey(namespace, key);
    const ttl = options.ttl || this.DEFAULT_TTL;
    
    try {
      // Validate data sovereignty rules
      if (options.indigenousData) {
        await this.validateDataSovereignty(value, options);
      }
      
      // Encode and compress value
      const encoded = await this.encodeValue(value);
      
      // Store in all tiers
      // L1: Memory cache
      this.memoryCache.set(fullKey, value, { ttl: ttl * 1000 });
      
      // L2: Node cache
      this.nodeCache.set(fullKey, value, ttl);
      
      // L3: Redis with TTL
      await this.setInRedis(fullKey, encoded, ttl);
      
      // Store metadata in database
      await this.storeCacheEntry(fullKey, value, options);
      
      // Replicate if needed
      if (options.replicate && this.redisCluster) {
        await this.replicateToCluster(fullKey, encoded, ttl);
      }
      
      return true;
    } catch (error) {
      console.error(`Cache set error for ${fullKey}:`, error);
      throw error;
    }
  }
  
  // Delete from all tiers
  async delete(key: string, namespace: string = 'default'): Promise<boolean> {
    const fullKey = this.buildKey(namespace, key);
    
    try {
      // Remove from all tiers
      this.memoryCache.delete(fullKey);
      this.nodeCache.del(fullKey);
      await this.redisClient.del(fullKey);
      
      // Mark as invalidated in database
      await prisma.cacheEntry.updateMany({
        where: { key: fullKey },
        data: {
          invalidatedAt: new Date(),
          invalidationReason: 'MANUAL_DELETE'
        }
      });
      
      return true;
    } catch (error) {
      console.error(`Cache delete error for ${fullKey}:`, error);
      return false;
    }
  }
  
  // Batch operations
  async mget(keys: string[], namespace: string = 'default'): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const missingKeys: string[] = [];
    
    // Check memory cache first
    for (const key of keys) {
      const fullKey = this.buildKey(namespace, key);
      const value = this.memoryCache.get(fullKey);
      
      if (value !== undefined) {
        results.set(key, value);
      } else {
        missingKeys.push(fullKey);
      }
    }
    
    // Batch get from Redis for missing keys
    if (missingKeys.length > 0) {
      const redisValues = await this.redisClient.mget(...missingKeys);
      
      for (let i = 0; i < missingKeys.length; i++) {
        if (redisValues[i]) {
          const decoded = await this.decodeValue(redisValues[i]);
          const originalKey = keys[i];
          results.set(originalKey, decoded);
          
          // Populate memory cache
          this.memoryCache.set(missingKeys[i], decoded);
        }
      }
    }
    
    return results;
  }
  
  async mset(entries: Map<string, any>, options: any = {}): Promise<boolean> {
    const namespace = options.namespace || 'default';
    const ttl = options.ttl || this.DEFAULT_TTL;
    const pipeline = this.redisClient.pipeline();
    
    for (const [key, value] of entries) {
      const fullKey = this.buildKey(namespace, key);
      const encoded = await this.encodeValue(value);
      
      // Add to pipeline
      pipeline.setex(fullKey, ttl, encoded);
      
      // Update memory cache
      this.memoryCache.set(fullKey, value);
    }
    
    await pipeline.exec();
    return true;
  }
  
  // Pattern-based operations
  async deletePattern(pattern: string, namespace: string = 'default'): Promise<number> {
    const fullPattern = this.buildKey(namespace, pattern);
    const keys = await this.redisClient.keys(fullPattern);
    
    if (keys.length === 0) return 0;
    
    // Delete from Redis
    await this.redisClient.del(...keys);
    
    // Clear from memory caches
    for (const key of keys) {
      this.memoryCache.delete(key);
      this.nodeCache.del(key);
    }
    
    return keys.length;
  }
  
  // TTL management
  async ttl(key: string, namespace: string = 'default'): Promise<number> {
    const fullKey = this.buildKey(namespace, key);
    return await this.redisClient.ttl(fullKey);
  }
  
  async expire(key: string, seconds: number, namespace: string = 'default'): Promise<boolean> {
    const fullKey = this.buildKey(namespace, key);
    const result = await this.redisClient.expire(fullKey, seconds);
    return result === 1;
  }
  
  // Cache warming
  async warmCache(warmupId: string): Promise<void> {
    const warmup = await prisma.cacheWarmup.findUnique({
      where: { id: warmupId }
    });
    
    if (!warmup || !warmup.active) return;
    
    const startTime = Date.now();
    let keysWarmed = 0;
    
    try {
      // Get data based on source
      const data = await this.fetchWarmupData(warmup);
      
      // Batch process data
      const batches = this.chunkArray(data, warmup.batchSize);
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (item: any) => {
            await this.set(item.key, item.value, {
              namespace: warmup.namespace,
              tags: warmup.tags,
              priority: warmup.priority,
              indigenousData: warmup.indigenousDataOnly
            });
            keysWarmed++;
          })
        );
      }
      
      // Update warmup status
      await prisma.cacheWarmup.update({
        where: { id: warmupId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'SUCCESS',
          lastRunDuration: Date.now() - startTime,
          keysWarmed
        }
      });
    } catch (error) {
      await prisma.cacheWarmup.update({
        where: { id: warmupId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'FAILED',
          lastRunDuration: Date.now() - startTime
        }
      });
      
      throw error;
    }
  }
  
  // Indigenous data sovereignty
  private async validateDataSovereignty(data: any, options: any): Promise<void> {
    if (!options.nation || !options.territory) {
      throw new Error('Indigenous data requires nation and territory information');
    }
    
    const rule = await prisma.dataSovereigntyRule.findFirst({
      where: {
        indigenousNation: options.nation,
        territory: options.territory,
        active: true
      }
    });
    
    if (rule) {
      // Validate data location
      if (rule.requiredLocation !== this.DATA_LOCATION) {
        throw new Error(`Data must be stored in ${rule.requiredLocation}`);
      }
      
      // Check Elder approval if required
      if (rule.requiresElderApproval && !options.elderApproved) {
        throw new Error('Elder approval required for this data');
      }
      
      // Check community consent
      if (rule.requiresCommunityConsent && !options.communityConsent) {
        throw new Error('Community consent required for this data');
      }
    }
  }
  
  // Consistent hashing for distribution
  private getShardKey(key: string): number {
    return murmurhash.v3(key) % (this.redisCluster?.nodes?.length || 1);
  }
  
  // Helper methods
  private buildKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
  
  private async encodeValue(value: any): Promise<string> {
    const serialized = msgpack.encode(value);
    
    // Compress if above threshold
    if (serialized.length > this.COMPRESSION_THRESHOLD) {
      const compressed = await compress(serialized);
      return compressed.toString('base64');
    }
    
    return serialized.toString('base64');
  }
  
  private async decodeValue(encoded: string): Promise<any> {
    const buffer = Buffer.from(encoded, 'base64');
    
    // Try to decompress first
    try {
      const decompressed = await uncompress(buffer);
      return msgpack.decode(decompressed);
    } catch {
      // Not compressed, decode directly
      return msgpack.decode(buffer);
    }
  }
  
  private async getFromRedis(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }
  
  private async setInRedis(key: string, value: string, ttl: number): Promise<void> {
    await this.redisClient.setex(key, ttl, value);
  }
  
  private async getFromDatabase(key: string, namespace: string): Promise<any> {
    const entry = await prisma.cacheEntry.findFirst({
      where: {
        key,
        namespace,
        isExpired: false
      }
    });
    
    return entry?.value || entry?.binaryValue;
  }
  
  private async storeCacheEntry(key: string, value: any, options: any): Promise<void> {
    const serialized = JSON.stringify(value);
    const checksum = crypto
      .createHash('md5')
      .update(serialized)
      .digest('hex');
    
    await prisma.cacheEntry.upsert({
      where: { key },
      create: {
        key,
        namespace: options.namespace || 'default',
        value: typeof value === 'object' ? value : { value },
        dataType: typeof value,
        originalSize: serialized.length,
        checksum,
        ttl: options.ttl || this.DEFAULT_TTL,
        expiresAt: new Date(Date.now() + (options.ttl || this.DEFAULT_TTL) * 1000),
        indigenousData: options.indigenousData || false,
        nation: options.nation,
        territory: options.territory,
        communityId: options.communityId,
        culturalSensitive: options.culturalSensitive || false,
        elderApproved: options.elderApproved || false,
        ceremonyData: options.ceremonyData || false,
        dataOwner: options.dataOwner,
        dataLocation: this.DATA_LOCATION,
        canLeaveTerritory: options.canLeaveTerritory !== false,
        tags: options.tags || [],
        category: options.category,
        priority: options.priority || 5
      },
      update: {
        value: typeof value === 'object' ? value : { value },
        originalSize: serialized.length,
        checksum,
        ttl: options.ttl || this.DEFAULT_TTL,
        expiresAt: new Date(Date.now() + (options.ttl || this.DEFAULT_TTL) * 1000),
        version: { increment: 1 },
        updatedAt: new Date()
      }
    });
  }
  
  private async trackAccess(key: string, accessType: string): Promise<void> {
    // Update access metrics
    await prisma.cacheEntry.updateMany({
      where: { key },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
        hitCount: accessType.includes('HIT') ? { increment: 1 } : undefined,
        missCount: accessType === 'MISS' ? { increment: 1 } : undefined
      }
    });
  }
  
  private async getCacheWithFallback(key: string): Promise<any> {
    // Fallback implementation for circuit breaker
    const entry = await prisma.cacheEntry.findFirst({
      where: { key },
      orderBy: { updatedAt: 'desc' }
    });
    
    return entry?.value;
  }
  
  private setupCluster(): void {
    const nodes = process.env.REDIS_CLUSTER_NODES?.split(',') || [];
    
    this.redisCluster = new Redis.Cluster(
      nodes.map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      }),
      {
        redisOptions: {
          password: process.env.REDIS_PASSWORD
        },
        clusterRetryStrategy: (times) => Math.min(times * 100, 3000)
      }
    );
  }
  
  private setupSentinel(): void {
    // Sentinel configuration for HA
    const sentinels = process.env.REDIS_SENTINEL_NODES?.split(',').map(node => {
      const [host, port] = node.split(':');
      return { host, port: parseInt(port) };
    });
    
    this.redisSentinel = new Redis({
      sentinels,
      name: process.env.REDIS_MASTER_NAME || 'mymaster',
      password: process.env.REDIS_PASSWORD,
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD
    });
  }
  
  private async replicateToCluster(key: string, value: string, ttl: number): Promise<void> {
    if (!this.redisCluster) return;
    
    const shardKey = this.getShardKey(key);
    await this.redisCluster.setex(key, ttl, value);
  }
  
  private async fetchWarmupData(warmup: any): Promise<any[]> {
    switch (warmup.dataSource) {
      case 'DATABASE':
        return await this.fetchFromDatabase(warmup.query);
      case 'API':
        return await this.fetchFromAPI(warmup.query);
      case 'FILE':
        return await this.fetchFromFile(warmup.query);
      default:
        return [];
    }
  }
  
  private async fetchFromDatabase(query: string): Promise<any[]> {
    // Execute raw query
    return await prisma.$queryRawUnsafe(query);
  }
  
  private async fetchFromAPI(endpoint: string): Promise<any[]> {
    // Fetch from API endpoint
    const response = await fetch(endpoint);
    return await response.json();
  }
  
  private async fetchFromFile(path: string): Promise<any[]> {
    // Read from file
    const fs = require('fs').promises;
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  }
  
  private chunkArray(array: any[], size: number): any[][] {
    const chunks: any[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  // Cache statistics
  async getStatistics(namespace?: string): Promise<any> {
    const keys = await this.redisClient.keys(
      namespace ? `${namespace}:*` : '*'
    );
    
    const memoryInfo = await this.redisClient.info('memory');
    const stats = await this.redisClient.info('stats');
    
    return {
      totalKeys: keys.length,
      memoryUsed: this.parseRedisInfo(memoryInfo, 'used_memory_human'),
      hitRate: this.parseRedisInfo(stats, 'keyspace_hit_ratio'),
      memoryCache: {
        size: this.memoryCache.size,
        calculatedSize: this.memoryCache.calculatedSize
      },
      nodeCache: {
        keys: this.nodeCache.keys().length,
        stats: this.nodeCache.getStats()
      }
    };
  }
  
  private parseRedisInfo(info: string, key: string): string {
    const match = info.match(new RegExp(`${key}:(.+)`));
    return match ? match[1].trim() : 'N/A';
  }
  
  // Cleanup expired entries
  async cleanup(): Promise<number> {
    const expired = await prisma.cacheEntry.findMany({
      where: {
        expiresAt: { lte: new Date() },
        isExpired: false
      }
    });
    
    for (const entry of expired) {
      await this.delete(entry.key, entry.namespace);
    }
    
    await prisma.cacheEntry.updateMany({
      where: {
        expiresAt: { lte: new Date() },
        isExpired: false
      },
      data: { isExpired: true }
    });
    
    return expired.length;
  }
}