import { PrismaClient } from '@prisma/client';
import AWS from 'aws-sdk';
import axios from 'axios';
import Redis from 'ioredis';
import Bull from 'bull';
import { LRUCache } from 'lru-cache';
import * as geoip from 'geoip-lite';
import * as crypto from 'crypto';
import * as etag from 'etag';
import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import sharp from 'sharp';
import { Server } from 'socket.io';
import * as promClient from 'prom-client';

interface CdnProvider {
  name: string;
  type: 'CLOUDFLARE' | 'AWS_CLOUDFRONT' | 'AZURE_CDN' | 'GCS_CDN' | 'FASTLY' | 'AKAMAI';
  client: any;
  priority: number;
  indigenousOwned?: boolean;
}

interface ContentOptions {
  indigenousContent?: boolean;
  elderContent?: boolean;
  ceremonyContent?: boolean;
  culturalContent?: boolean;
  sacredContent?: boolean;
  nation?: string;
  territory?: string;
  language?: string;
  priority?: number;
  preload?: boolean;
  prefetch?: boolean;
  cacheControl?: string;
  maxAge?: number;
  geoRestrictions?: string[];
  signedUrl?: boolean;
  tokenAuth?: boolean;
  encryptionEnabled?: boolean;
}

interface PurgeOptions {
  purgeType: 'SINGLE' | 'PATTERN' | 'TAG' | 'ALL';
  pattern?: string;
  tags?: string[];
  edgeLocations?: string[];
  indigenousPurge?: boolean;
  ceremonyPurge?: boolean;
  elderDirected?: boolean;
}

export class CdnService extends EventEmitter {
  private prisma: PrismaClient;
  private redis: Redis;
  private cache: LRUCache<string, any>;
  private providers: Map<string, CdnProvider> = new Map();
  private purgeQueue: Bull.Queue;
  private preloadQueue: Bull.Queue;
  private analyticsQueue: Bull.Queue;
  private logger: winston.Logger;
  private io?: Server;
  private metrics: any;
  
  // Indigenous optimization settings
  private readonly ELDER_CONTENT_PRIORITY = 1;
  private readonly CEREMONY_CONTENT_PRIORITY = 2;
  private readonly CULTURAL_CONTENT_PRIORITY = 3;
  private readonly CANADIAN_EDGE_LOCATIONS = ['YYZ', 'YVR', 'YYC', 'YUL', 'YEG', 'YOW'];
  private readonly INDIGENOUS_TERRITORIES = new Map([
    ['YYZ', 'Mississaugas of the Credit'],
    ['YVR', 'Musqueam, Squamish, Tsleil-Waututh'],
    ['YYC', 'Treaty 7'],
    ['YUL', 'Kanien'kehá:ka'],
    ['YEG', 'Treaty 6'],
    ['YOW', 'Algonquin Anishinaabeg']
  ]);
  
  // Cache settings
  private readonly DEFAULT_CACHE_TTL = 3600; // 1 hour
  private readonly ELDER_CACHE_TTL = 7200; // 2 hours for Elder content
  private readonly CEREMONY_CACHE_TTL = 86400; // 24 hours for ceremony content
  
  constructor(io?: Server) {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.io = io;
    
    // Initialize LRU cache
    this.cache = new LRUCache<string, any>({
      max: 10000,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true
    });
    
    // Initialize queues
    this.purgeQueue = new Bull('cdn-purge', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    this.preloadQueue = new Bull('cdn-preload', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    this.analyticsQueue = new Bull('cdn-analytics', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    // Initialize metrics
    this.setupMetrics();
    
    // Initialize providers
    this.initializeProviders();
    
    // Setup queue processors
    this.setupQueueProcessors();
    
    // Start edge location monitoring
    this.startEdgeMonitoring();
  }
  
  private setupMetrics() {
    // Create Prometheus metrics
    this.metrics = {
      requests: new promClient.Counter({
        name: 'cdn_requests_total',
        help: 'Total CDN requests',
        labelNames: ['method', 'status', 'location', 'indigenous']
      }),
      bandwidth: new promClient.Counter({
        name: 'cdn_bandwidth_bytes',
        help: 'CDN bandwidth usage',
        labelNames: ['direction', 'location', 'indigenous']
      }),
      cacheHitRate: new promClient.Gauge({
        name: 'cdn_cache_hit_rate',
        help: 'CDN cache hit rate',
        labelNames: ['location']
      }),
      responseTime: new promClient.Histogram({
        name: 'cdn_response_time_ms',
        help: 'CDN response time',
        labelNames: ['location', 'indigenous'],
        buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
      })
    };
    
    // Register metrics
    promClient.register.registerMetric(this.metrics.requests);
    promClient.register.registerMetric(this.metrics.bandwidth);
    promClient.register.registerMetric(this.metrics.cacheHitRate);
    promClient.register.registerMetric(this.metrics.responseTime);
  }
  
  private async initializeProviders() {
    // AWS CloudFront
    if (process.env.AWS_ACCESS_KEY_ID) {
      const cloudfront = new AWS.CloudFront({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'ca-central-1' // Canadian region
      });
      
      this.providers.set('cloudfront', {
        name: 'AWS CloudFront',
        type: 'AWS_CLOUDFRONT',
        client: cloudfront,
        priority: 2
      });
    }
    
    // Cloudflare (if configured)
    if (process.env.CLOUDFLARE_API_KEY) {
      // Would initialize Cloudflare client
      this.providers.set('cloudflare', {
        name: 'Cloudflare',
        type: 'CLOUDFLARE',
        client: null, // Cloudflare client
        priority: 1
      });
    }
    
    // Indigenous-owned CDN (placeholder for future Indigenous infrastructure)
    if (process.env.INDIGENOUS_CDN_ENABLED === 'true') {
      this.providers.set('indigenous', {
        name: 'Indigenous CDN',
        type: 'AWS_CLOUDFRONT', // Using CloudFront as base
        client: null,
        priority: 0, // Highest priority
        indigenousOwned: true
      });
    }
    
    // Load edge locations from database
    await this.loadEdgeLocations();
  }
  
  private async loadEdgeLocations() {
    const locations = await this.prisma.cdnEdgeLocation.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' }
    });
    
    // Initialize Canadian edge locations if not exists
    for (const code of this.CANADIAN_EDGE_LOCATIONS) {
      const exists = locations.find(l => l.locationCode === code);
      if (!exists) {
        await this.createEdgeLocation({
          locationCode: code,
          locationName: `Edge ${code}`,
          city: this.getCityFromCode(code),
          province: this.getProvinceFromCode(code),
          indigenousTerritory: this.INDIGENOUS_TERRITORIES.get(code),
          elderPriority: true,
          ceremonyOptimized: true,
          culturalCache: true
        });
      }
    }
  }
  
  private getCityFromCode(code: string): string {
    const cities: Record<string, string> = {
      'YYZ': 'Toronto',
      'YVR': 'Vancouver',
      'YYC': 'Calgary',
      'YUL': 'Montreal',
      'YEG': 'Edmonton',
      'YOW': 'Ottawa'
    };
    return cities[code] || 'Unknown';
  }
  
  private getProvinceFromCode(code: string): string {
    const provinces: Record<string, string> = {
      'YYZ': 'Ontario',
      'YVR': 'British Columbia',
      'YYC': 'Alberta',
      'YUL': 'Quebec',
      'YEG': 'Alberta',
      'YOW': 'Ontario'
    };
    return provinces[code] || 'Unknown';
  }
  
  private setupQueueProcessors() {
    // Purge queue processor
    this.purgeQueue.process(async (job) => {
      const { purgeId } = job.data;
      await this.processPurge(purgeId);
    });
    
    // Preload queue processor
    this.preloadQueue.process(async (job) => {
      const { preloadId } = job.data;
      await this.processPreload(preloadId);
    });
    
    // Analytics queue processor
    this.analyticsQueue.process(async (job) => {
      const { date, hour } = job.data;
      await this.processAnalytics(date, hour);
    });
  }
  
  private startEdgeMonitoring() {
    // Monitor edge locations every 5 minutes
    setInterval(async () => {
      await this.monitorEdgeLocations();
    }, 5 * 60 * 1000);
    
    // Collect analytics every hour
    setInterval(async () => {
      const now = new Date();
      await this.analyticsQueue.add('processAnalytics', {
        date: now,
        hour: now.getHours()
      });
    }, 60 * 60 * 1000);
  }
  
  async publishContent(url: string, options: ContentOptions = {}): Promise<string> {
    try {
      const contentId = uuidv4();
      
      // Determine content type
      const contentType = mime.lookup(url) || 'application/octet-stream';
      
      // Calculate cache TTL based on content type
      let cacheTtl = options.maxAge || this.DEFAULT_CACHE_TTL;
      if (options.elderContent) {
        cacheTtl = this.ELDER_CACHE_TTL;
      } else if (options.ceremonyContent) {
        cacheTtl = this.CEREMONY_CACHE_TTL;
      }
      
      // Generate CDN URL
      const cdnUrl = await this.generateCdnUrl(url, contentId, options);
      
      // Select edge locations based on Indigenous context
      const edgeLocations = await this.selectEdgeLocations(options);
      
      // Create content record
      const content = await this.prisma.cdnContent.create({
        data: {
          id: contentId,
          contentId,
          url,
          cdnUrl,
          contentType,
          contentLength: BigInt(0), // Will be updated on first fetch
          cacheControl: options.cacheControl || `public, max-age=${cacheTtl}`,
          maxAge: cacheTtl,
          indigenousContent: options.indigenousContent || false,
          elderContent: options.elderContent || false,
          ceremonyContent: options.ceremonyContent || false,
          culturalContent: options.culturalContent || false,
          sacredContent: options.sacredContent || false,
          nation: options.nation,
          territory: options.territory,
          language: options.language,
          priority: options.priority || 5,
          preload: options.preload || false,
          prefetch: options.prefetch || false,
          edgeLocations,
          primaryLocation: edgeLocations[0],
          geoRestrictions: options.geoRestrictions || [],
          signedUrl: options.signedUrl || false,
          tokenAuth: options.tokenAuth || false,
          encryptionEnabled: options.encryptionEnabled || false,
          status: 'ACTIVE'
        }
      });
      
      // Create cache rules for Indigenous content
      if (options.indigenousContent) {
        await this.createIndigenousRules(contentId, options);
      }
      
      // Preload to edge if requested
      if (options.preload) {
        await this.preloadQueue.add('preload', {
          url,
          edgeLocations,
          priority: options.priority || 5,
          indigenousContent: options.indigenousContent
        });
      }
      
      // Track metrics
      this.metrics.requests.inc({
        method: 'PUBLISH',
        status: 'SUCCESS',
        location: edgeLocations[0],
        indigenous: options.indigenousContent ? 'true' : 'false'
      });
      
      this.emit('contentPublished', content);
      
      return contentId;
    } catch (error) {
      this.logger.error('Failed to publish content:', error);
      throw error;
    }
  }
  
  private async generateCdnUrl(originalUrl: string, contentId: string, options: ContentOptions): Promise<string> {
    const baseUrl = process.env.CDN_BASE_URL || 'https://cdn.indigenous.ca';
    
    // Add nation-specific subdomain for Indigenous content
    let cdnUrl = baseUrl;
    if (options.nation) {
      cdnUrl = cdnUrl.replace('cdn', `cdn-${options.nation.toLowerCase()}`);
    }
    
    // Generate path
    const urlPath = new URL(originalUrl).pathname;
    cdnUrl = `${cdnUrl}/${contentId}${urlPath}`;
    
    // Add query parameters for special content
    const params = new URLSearchParams();
    if (options.elderContent) params.append('elder', '1');
    if (options.ceremonyContent) params.append('ceremony', '1');
    if (options.language) params.append('lang', options.language);
    
    if (params.toString()) {
      cdnUrl += `?${params.toString()}`;
    }
    
    return cdnUrl;
  }
  
  private async selectEdgeLocations(options: ContentOptions): Promise<string[]> {
    let locations: string[] = [];
    
    // For Indigenous content, prioritize Canadian locations
    if (options.indigenousContent || options.nation) {
      locations = [...this.CANADIAN_EDGE_LOCATIONS];
      
      // Add territory-specific locations
      if (options.territory) {
        const territoryLocations = await this.getTerritory

();
        locations = [...new Set([...territoryLocations, ...locations])];
      }
    } else {
      // Use all available locations
      const allLocations = await this.prisma.cdnEdgeLocation.findMany({
        where: { active: true },
        orderBy: { priority: 'asc' }
      });
      locations = allLocations.map(l => l.locationCode);
    }
    
    // Prioritize locations for Elder content
    if (options.elderContent) {
      const elderLocations = await this.prisma.cdnEdgeLocation.findMany({
        where: { 
          active: true,
          elderPriority: true
        },
        orderBy: { priority: 'asc' }
      });
      locations = [...elderLocations.map(l => l.locationCode), ...locations];
    }
    
    // Ensure uniqueness and limit
    return [...new Set(locations)].slice(0, 10);
  }
  
  private async getTerritoryLocations(territory: string): Promise<string[]> {
    const locations = await this.prisma.cdnEdgeLocation.findMany({
      where: {
        OR: [
          { indigenousTerritory: { contains: territory } },
          { treatyArea: { contains: territory } }
        ],
        active: true
      }
    });
    
    return locations.map(l => l.locationCode);
  }
  
  private async createIndigenousRules(contentId: string, options: ContentOptions) {
    const rules = [];
    
    // Elder access rule
    if (options.elderContent) {
      rules.push({
        contentId,
        ruleId: `elder-${uuidv4()}`,
        ruleName: 'Elder Priority Access',
        ruleType: 'CACHE',
        priority: this.ELDER_CONTENT_PRIORITY,
        indigenousRule: true,
        elderAccess: true,
        cacheTtl: this.ELDER_CACHE_TTL,
        active: true
      });
    }
    
    // Ceremony access rule
    if (options.ceremonyContent) {
      rules.push({
        contentId,
        ruleId: `ceremony-${uuidv4()}`,
        ruleName: 'Ceremony Content Protection',
        ruleType: 'SECURITY',
        priority: this.CEREMONY_CONTENT_PRIORITY,
        indigenousRule: true,
        ceremonyAccess: true,
        action: 'ALLOW',
        active: true
      });
    }
    
    // Nation-specific rule
    if (options.nation) {
      rules.push({
        contentId,
        ruleId: `nation-${uuidv4()}`,
        ruleName: `${options.nation} Nation Content`,
        ruleType: 'ORIGIN',
        priority: 5,
        indigenousRule: true,
        nationSpecific: options.nation,
        active: true
      });
    }
    
    // Sacred content protection
    if (options.sacredContent) {
      rules.push({
        contentId,
        ruleId: `sacred-${uuidv4()}`,
        ruleName: 'Sacred Content Protection',
        ruleType: 'SECURITY',
        priority: 1,
        indigenousRule: true,
        action: 'DENY',
        actionConfig: {
          requiresElderApproval: true,
          restrictedAccess: true
        },
        active: true
      });
    }
    
    // Create all rules
    for (const rule of rules) {
      await this.prisma.cdnRule.create({ data: rule });
    }
  }
  
  async serveContent(contentId: string, request: any): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `content:${contentId}:${this.generateRequestHash(request)}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        // Update hit metrics
        await this.updateMetrics(contentId, 'HIT', request);
        return JSON.parse(cached);
      }
      
      // Get content configuration
      const content = await this.prisma.cdnContent.findUnique({
        where: { id: contentId },
        include: { rules: true }
      });
      
      if (!content) {
        throw new Error('Content not found');
      }
      
      // Check access rules
      await this.checkAccessRules(content, request);
      
      // Check geo restrictions
      if (content.geoRestrictions.length > 0) {
        await this.checkGeoRestrictions(content, request);
      }
      
      // Get content from origin or edge
      const response = await this.fetchContent(content, request);
      
      // Cache the response
      await this.redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        content.maxAge
      );
      
      // Update miss metrics
      await this.updateMetrics(contentId, 'MISS', request);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to serve content:', error);
      throw error;
    }
  }
  
  private generateRequestHash(request: any): string {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify({
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      acceptLanguage: request.headers['accept-language']
    }));
    return hash.digest('hex');
  }
  
  private async checkAccessRules(content: any, request: any) {
    // Check Indigenous access rules
    if (content.elderContent) {
      const hasElderAccess = await this.verifyElderAccess(request);
      if (!hasElderAccess) {
        throw new Error('Elder access required');
      }
    }
    
    if (content.ceremonyContent) {
      const hasCeremonyAccess = await this.verifyCeremonyAccess(request);
      if (!hasCeremonyAccess) {
        throw new Error('Ceremony access required');
      }
    }
    
    if (content.sacredContent) {
      throw new Error('Sacred content requires special permission');
    }
  }
  
  private async verifyElderAccess(request: any): Promise<boolean> {
    // Would integrate with authentication service
    // Check if user has Elder role
    const userRole = request.headers['x-user-role'];
    return userRole === 'elder' || userRole === 'admin';
  }
  
  private async verifyCeremonyAccess(request: any): Promise<boolean> {
    // Would check if request is during ceremony time
    // and if user is ceremony participant
    const userRole = request.headers['x-user-role'];
    return ['elder', 'ceremony-participant', 'admin'].includes(userRole);
  }
  
  private async checkGeoRestrictions(content: any, request: any) {
    const ip = request.ip || request.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    
    if (!geo) {
      throw new Error('Could not determine location');
    }
    
    if (content.geoRestrictions.includes(geo.country)) {
      throw new Error(`Content not available in ${geo.country}`);
    }
  }
  
  private async fetchContent(content: any, request: any): Promise<any> {
    // Select best edge location
    const edgeLocation = await this.selectBestEdgeLocation(content, request);
    
    // Try edge cache first
    const edgeResponse = await this.fetchFromEdge(content, edgeLocation);
    if (edgeResponse) {
      return edgeResponse;
    }
    
    // Fetch from origin
    const originResponse = await this.fetchFromOrigin(content);
    
    // Push to edge for future requests
    await this.pushToEdge(content, originResponse, edgeLocation);
    
    return originResponse;
  }
  
  private async selectBestEdgeLocation(content: any, request: any): Promise<string> {
    const ip = request.ip || request.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    
    if (!geo) {
      return content.primaryLocation || this.CANADIAN_EDGE_LOCATIONS[0];
    }
    
    // Find nearest edge location
    const locations = await this.prisma.cdnEdgeLocation.findMany({
      where: {
        locationCode: { in: content.edgeLocations },
        active: true,
        healthy: true
      }
    });
    
    // Simple distance calculation (would use proper geo distance in production)
    let nearest = locations[0];
    let minDistance = Infinity;
    
    for (const location of locations) {
      const distance = Math.sqrt(
        Math.pow(location.latitude - geo.ll[0], 2) +
        Math.pow(location.longitude - geo.ll[1], 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = location;
      }
    }
    
    return nearest?.locationCode || content.primaryLocation;
  }
  
  private async fetchFromEdge(content: any, edgeLocation: string): Promise<any> {
    const cacheKey = `edge:${edgeLocation}:${content.contentId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }
  
  private async fetchFromOrigin(content: any): Promise<any> {
    try {
      const response = await axios.get(content.url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return {
        data: response.data,
        headers: response.headers,
        status: response.status
      };
    } catch (error) {
      this.logger.error('Failed to fetch from origin:', error);
      throw error;
    }
  }
  
  private async pushToEdge(content: any, response: any, edgeLocation: string) {
    const cacheKey = `edge:${edgeLocation}:${content.contentId}`;
    
    await this.redis.set(
      cacheKey,
      JSON.stringify(response),
      'EX',
      content.maxAge
    );
  }
  
  async purgeContent(contentId: string, options: PurgeOptions): Promise<string> {
    try {
      const purgeId = uuidv4();
      
      // Create purge record
      const purge = await this.prisma.cdnPurge.create({
        data: {
          id: purgeId,
          purgeId,
          contentId,
          purgeType: options.purgeType,
          purgePattern: options.pattern,
          purgeTags: options.tags || [],
          edgeLocations: options.edgeLocations || ['ALL'],
          indigenousPurge: options.indigenousPurge || false,
          ceremonyPurge: options.ceremonyPurge || false,
          elderDirected: options.elderDirected || false,
          status: 'IN_PROGRESS',
          requestedBy: 'system', // Would get from auth context
          reason: 'API request'
        }
      });
      
      // Queue purge job
      await this.purgeQueue.add('purge', { purgeId }, {
        priority: options.elderDirected ? 1 : 5
      });
      
      this.emit('purgeStarted', purge);
      
      return purgeId;
    } catch (error) {
      this.logger.error('Failed to initiate purge:', error);
      throw error;
    }
  }
  
  private async processPurge(purgeId: string) {
    try {
      const purge = await this.prisma.cdnPurge.findUnique({
        where: { id: purgeId }
      });
      
      if (!purge) return;
      
      let itemsPurged = 0;
      let bytesPurged = BigInt(0);
      const locationsCompleted: string[] = [];
      
      // Process based on purge type
      switch (purge.purgeType) {
        case 'SINGLE':
          if (purge.contentId) {
            await this.purgeSingleContent(purge.contentId);
            itemsPurged = 1;
          }
          break;
          
        case 'PATTERN':
          if (purge.purgePattern) {
            const results = await this.purgeByPattern(purge.purgePattern);
            itemsPurged = results.count;
            bytesPurged = results.bytes;
          }
          break;
          
        case 'TAG':
          if (purge.purgeTags.length > 0) {
            const results = await this.purgeByTags(purge.purgeTags);
            itemsPurged = results.count;
            bytesPurged = results.bytes;
          }
          break;
          
        case 'ALL':
          const results = await this.purgeAll();
          itemsPurged = results.count;
          bytesPurged = results.bytes;
          break;
      }
      
      // Clear from edge locations
      for (const location of purge.edgeLocations) {
        if (location === 'ALL') {
          // Clear all locations
          const allLocations = await this.prisma.cdnEdgeLocation.findMany({
            where: { active: true }
          });
          
          for (const loc of allLocations) {
            await this.clearEdgeLocation(loc.locationCode, purge.contentId);
            locationsCompleted.push(loc.locationCode);
          }
        } else {
          await this.clearEdgeLocation(location, purge.contentId);
          locationsCompleted.push(location);
        }
      }
      
      // Update purge record
      await this.prisma.cdnPurge.update({
        where: { id: purgeId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          itemsPurged,
          bytesPurged,
          locationsCompleted,
          completedAt: new Date()
        }
      });
      
      this.emit('purgeCompleted', { purgeId, itemsPurged, bytesPurged });
    } catch (error) {
      this.logger.error('Purge processing failed:', error);
      
      await this.prisma.cdnPurge.update({
        where: { id: purgeId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
  
  private async purgeSingleContent(contentId: string) {
    // Clear from Redis cache
    const keys = await this.redis.keys(`*:${contentId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // Clear from LRU cache
    this.cache.clear();
    
    // Update content status
    await this.prisma.cdnContent.update({
      where: { id: contentId },
      data: {
        status: 'PURGED',
        purgedAt: new Date()
      }
    });
  }
  
  private async purgeByPattern(pattern: string): Promise<{ count: number; bytes: BigInt }> {
    const keys = await this.redis.keys(pattern);
    let bytes = BigInt(0);
    
    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        bytes += BigInt(Buffer.byteLength(value));
      }
    }
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    return { count: keys.length, bytes };
  }
  
  private async purgeByTags(tags: string[]): Promise<{ count: number; bytes: BigInt }> {
    // Implementation would search for content by tags
    // and purge matching content
    return { count: 0, bytes: BigInt(0) };
  }
  
  private async purgeAll(): Promise<{ count: number; bytes: BigInt }> {
    await this.redis.flushall();
    this.cache.clear();
    
    const contents = await this.prisma.cdnContent.count();
    
    await this.prisma.cdnContent.updateMany({
      data: {
        status: 'PURGED',
        purgedAt: new Date()
      }
    });
    
    return { count: contents, bytes: BigInt(0) };
  }
  
  private async clearEdgeLocation(locationCode: string, contentId?: string) {
    if (contentId) {
      const key = `edge:${locationCode}:${contentId}`;
      await this.redis.del(key);
    } else {
      const keys = await this.redis.keys(`edge:${locationCode}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
  
  private async processPreload(preloadId: string) {
    try {
      const preload = await this.prisma.cdnPreload.findUnique({
        where: { id: preloadId }
      });
      
      if (!preload) return;
      
      // Update status
      await this.prisma.cdnPreload.update({
        where: { id: preloadId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });
      
      // Fetch content
      const response = await axios.get(preload.url, {
        responseType: 'arraybuffer'
      });
      
      const data = response.data;
      const size = Buffer.byteLength(data);
      
      // Push to edge locations
      const locationsCompleted: string[] = [];
      
      for (const location of preload.edgeLocations) {
        if (location === 'ALL') {
          const allLocations = await this.prisma.cdnEdgeLocation.findMany({
            where: { active: true }
          });
          
          for (const loc of allLocations) {
            await this.pushToEdgeLocation(loc.locationCode, preload.url, data);
            locationsCompleted.push(loc.locationCode);
          }
        } else {
          await this.pushToEdgeLocation(location, preload.url, data);
          locationsCompleted.push(location);
        }
      }
      
      // Update preload record
      await this.prisma.cdnPreload.update({
        where: { id: preloadId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          bytesPreloaded: BigInt(size),
          locationsCompleted,
          completedAt: new Date()
        }
      });
      
      this.emit('preloadCompleted', { preloadId, size, locationsCompleted });
    } catch (error) {
      this.logger.error('Preload processing failed:', error);
      
      await this.prisma.cdnPreload.update({
        where: { id: preloadId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
  
  private async pushToEdgeLocation(locationCode: string, url: string, data: Buffer) {
    const key = `edge:${locationCode}:${crypto.createHash('md5').update(url).digest('hex')}`;
    await this.redis.set(key, data, 'EX', this.DEFAULT_CACHE_TTL);
  }
  
  private async updateMetrics(contentId: string, hitType: 'HIT' | 'MISS', request: any) {
    const content = await this.prisma.cdnContent.findUnique({
      where: { id: contentId }
    });
    
    if (!content) return;
    
    // Update content metrics
    if (hitType === 'HIT') {
      await this.prisma.cdnContent.update({
        where: { id: contentId },
        data: {
          hitCount: { increment: 1 }
        }
      });
    } else {
      await this.prisma.cdnContent.update({
        where: { id: contentId },
        data: {
          missCount: { increment: 1 }
        }
      });
    }
    
    // Track in metrics system
    const ip = request.ip || request.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    
    await this.prisma.cdnMetric.create({
      data: {
        contentId,
        period: 'MINUTE',
        requests: BigInt(1),
        cacheHits: hitType === 'HIT' ? BigInt(1) : BigInt(0),
        cacheMisses: hitType === 'MISS' ? BigInt(1) : BigInt(0),
        indigenousRequests: content.indigenousContent ? BigInt(1) : BigInt(0),
        elderRequests: content.elderContent ? BigInt(1) : BigInt(0),
        ceremonyRequests: content.ceremonyContent ? BigInt(1) : BigInt(0)
      }
    });
  }
  
  private async monitorEdgeLocations() {
    const locations = await this.prisma.cdnEdgeLocation.findMany({
      where: { active: true }
    });
    
    for (const location of locations) {
      try {
        // Check health of each location
        // This would ping the actual edge servers
        const healthy = await this.checkEdgeHealth(location);
        
        if (healthy !== location.healthy) {
          await this.prisma.cdnEdgeLocation.update({
            where: { id: location.id },
            data: { healthy }
          });
          
          if (!healthy) {
            this.emit('edgeLocationDown', location);
          } else {
            this.emit('edgeLocationUp', location);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to monitor edge location ${location.locationCode}:`, error);
      }
    }
  }
  
  private async checkEdgeHealth(location: any): Promise<boolean> {
    // Would implement actual health check
    // For now, return true
    return true;
  }
  
  private async processAnalytics(date: Date, hour: number) {
    try {
      // Aggregate metrics for the hour
      const metrics = await this.prisma.cdnMetric.aggregate({
        where: {
          timestamp: {
            gte: new Date(date.setHours(hour, 0, 0, 0)),
            lt: new Date(date.setHours(hour + 1, 0, 0, 0))
          }
        },
        _sum: {
          requests: true,
          bytesIn: true,
          bytesOut: true,
          cacheHits: true,
          cacheMisses: true,
          indigenousRequests: true,
          elderRequests: true,
          ceremonyRequests: true,
          errors4xx: true,
          errors5xx: true
        },
        _avg: {
          averageResponseTime: true,
          cacheHitRatio: true
        }
      });
      
      // Calculate cache hit rate
      const totalRequests = Number(metrics._sum.requests || 0);
      const cacheHits = Number(metrics._sum.cacheHits || 0);
      const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
      
      // Create analytics record
      await this.prisma.cdnAnalytics.create({
        data: {
          date: new Date(date.setHours(0, 0, 0, 0)),
          hour,
          totalRequests: metrics._sum.requests || BigInt(0),
          totalBandwidth: (metrics._sum.bytesIn || BigInt(0)) + (metrics._sum.bytesOut || BigInt(0)),
          cacheHitRate,
          indigenousTraffic: metrics._sum.indigenousRequests || BigInt(0),
          elderAccess: metrics._sum.elderRequests || BigInt(0),
          ceremonyStreaming: metrics._sum.ceremonyRequests || BigInt(0),
          averageResponseTime: metrics._avg.averageResponseTime,
          error4xxCount: BigInt(metrics._sum.errors4xx || 0),
          error5xxCount: BigInt(metrics._sum.errors5xx || 0)
        }
      });
    } catch (error) {
      this.logger.error('Failed to process analytics:', error);
    }
  }
  
  async createEdgeLocation(data: any): Promise<string> {
    const location = await this.prisma.cdnEdgeLocation.create({
      data: {
        ...data,
        locationId: uuidv4(),
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        totalCapacity: BigInt(data.totalCapacity || 1000000000000), // 1TB default
        bandwidth: BigInt(data.bandwidth || 10000000000) // 10Gbps default
      }
    });
    
    return location.id;
  }
  
  async getAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const analytics = await this.prisma.cdnAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
    
    // Calculate Indigenous-specific metrics
    const indigenousMetrics = {
      totalIndigenousTraffic: analytics.reduce((sum, a) => sum + Number(a.indigenousTraffic), 0),
      totalElderAccess: analytics.reduce((sum, a) => sum + Number(a.elderAccess), 0),
      totalCeremonyStreaming: analytics.reduce((sum, a) => sum + Number(a.ceremonyStreaming), 0),
      averageCacheHitRate: analytics.reduce((sum, a) => sum + (a.cacheHitRate || 0), 0) / analytics.length
    };
    
    return {
      analytics,
      indigenousMetrics
    };
  }
  
  async getMetrics(): Promise<any> {
    return promClient.register.metrics();
  }
}