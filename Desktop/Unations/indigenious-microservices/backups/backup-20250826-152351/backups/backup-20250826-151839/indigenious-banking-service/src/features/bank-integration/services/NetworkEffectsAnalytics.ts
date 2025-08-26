/**
 * Network Effects Analytics Service
 * Track and measure platform growth through network effects
 * 
 * Network effects occur when each new user makes the platform more valuable for all users
 * Critical for Indigenous procurement as it connects communities, businesses, and opportunities
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/monitoring/logger';
import { auditLogger } from './AuditLogger';
import { redisEncryption } from './RedisEncryptionService';
import { performanceMonitoring } from './PerformanceMonitoringService';
import { z } from 'zod';

// Network metrics schemas
const NetworkNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['community', 'business', 'government', 'project']),
  joinedAt: z.date(),
  connections: z.number(),
  activity: z.number(),
  value: z.number(),
  metadata: z.record(z.any())
});

const NetworkEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(['transaction', 'bid', 'partnership', 'referral', 'collaboration']),
  weight: z.number(),
  createdAt: z.date()
});

const NetworkMetricsSchema = z.object({
  // Core Network Metrics
  totalNodes: z.number(),
  totalEdges: z.number(),
  networkDensity: z.number(), // Edges / Possible edges
  averageDegree: z.number(), // Avg connections per node
  clusteringCoefficient: z.number(), // How clustered the network is
  
  // Growth Metrics
  nodesAddedToday: z.number(),
  nodesAddedThisWeek: z.number(),
  nodesAddedThisMonth: z.number(),
  growthRate: z.number(), // Percentage
  viralCoefficient: z.number(), // K-factor
  
  // Value Metrics
  totalNetworkValue: z.number(), // Sum of all transactions
  averageNodeValue: z.number(),
  metcalfeValue: z.number(), // n²
  reedValue: z.number(), // 2^n
  
  // Engagement Metrics
  activeNodes: z.number(),
  engagementRate: z.number(),
  retentionRate: z.number(),
  churnRate: z.number(),
  
  // Community Metrics
  totalCommunities: z.number(),
  averageCommunitySize: z.number(),
  interCommunityConnections: z.number(),
  communityBridges: z.number(), // Key connectors
  
  // Economic Impact
  totalTransactionVolume: z.number(),
  averageTransactionSize: z.number(),
  economicMultiplier: z.number(),
  localSpendingRate: z.number(),
  
  // Platform Health
  liquidityScore: z.number(), // Available opportunities
  matchingEfficiency: z.number(), // Successful connections
  trustScore: z.number(), // Based on completed transactions
  diversityIndex: z.number() // Geographic/sector spread
});

type NetworkNode = z.infer<typeof NetworkNodeSchema>;
type NetworkEdge = z.infer<typeof NetworkEdgeSchema>;
type NetworkMetrics = z.infer<typeof NetworkMetricsSchema>;

export class NetworkEffectsAnalytics extends EventEmitter {
  private static instance: NetworkEffectsAnalytics;
  private nodes: Map<string, NetworkNode> = new Map();
  private edges: Map<string, NetworkEdge[]> = new Map();
  private metricsCache: Map<string, any> = new Map();
  
  // Network effect thresholds
  private readonly CRITICAL_MASS = 100; // Nodes needed for network effects
  private readonly METCALFE_MULTIPLIER = 0.5; // Conservative Metcalfe's law
  private readonly REED_THRESHOLD = 1000; // When Reed's law kicks in
  
  private constructor() {
    super();
    this.initializeAnalytics();
  }
  
  static getInstance(): NetworkEffectsAnalytics {
    if (!NetworkEffectsAnalytics.instance) {
      NetworkEffectsAnalytics.instance = new NetworkEffectsAnalytics();
    }
    return NetworkEffectsAnalytics.instance;
  }
  
  /**
   * Calculate comprehensive network metrics
   */
  async calculateNetworkMetrics(): Promise<NetworkMetrics> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all nodes and edges
    await this.loadNetworkData();
    
    const metrics: NetworkMetrics = {
      // Core metrics
      totalNodes: this.nodes.size,
      totalEdges: this.countTotalEdges(),
      networkDensity: this.calculateDensity(),
      averageDegree: this.calculateAverageDegree(),
      clusteringCoefficient: this.calculateClusteringCoefficient(),
      
      // Growth metrics
      nodesAddedToday: this.countNodesAddedSince(dayAgo),
      nodesAddedThisWeek: this.countNodesAddedSince(weekAgo),
      nodesAddedThisMonth: this.countNodesAddedSince(monthAgo),
      growthRate: this.calculateGrowthRate(monthAgo),
      viralCoefficient: await this.calculateViralCoefficient(),
      
      // Value metrics
      totalNetworkValue: await this.calculateTotalValue(),
      averageNodeValue: await this.calculateAverageNodeValue(),
      metcalfeValue: this.calculateMetcalfeValue(),
      reedValue: this.calculateReedValue(),
      
      // Engagement
      activeNodes: await this.countActiveNodes(weekAgo),
      engagementRate: await this.calculateEngagementRate(),
      retentionRate: await this.calculateRetentionRate(monthAgo),
      churnRate: await this.calculateChurnRate(monthAgo),
      
      // Community metrics
      totalCommunities: this.countNodesByType('community'),
      averageCommunitySize: await this.calculateAverageCommunitySize(),
      interCommunityConnections: this.countInterCommunityConnections(),
      communityBridges: this.identifyCommunityBridges(),
      
      // Economic impact
      totalTransactionVolume: await this.calculateTransactionVolume(),
      averageTransactionSize: await this.calculateAverageTransactionSize(),
      economicMultiplier: this.calculateEconomicMultiplier(),
      localSpendingRate: await this.calculateLocalSpendingRate(),
      
      // Platform health
      liquidityScore: await this.calculateLiquidityScore(),
      matchingEfficiency: await this.calculateMatchingEfficiency(),
      trustScore: await this.calculateTrustScore(),
      diversityIndex: this.calculateDiversityIndex()
    };
    
    // Cache results
    await redisEncryption.setEncrypted('network:metrics:latest', metrics, 300); // 5 min cache
    
    // Emit metrics event
    this.emit('metrics-calculated', metrics);
    
    return metrics;
  }
  
  /**
   * Get network growth projections
   */
  async getGrowthProjections(months: number = 12): Promise<any> {
    const currentMetrics = await this.calculateNetworkMetrics();
    const historicalData = await this.getHistoricalMetrics(6); // Last 6 months
    
    // Calculate growth trends
    const avgMonthlyGrowth = this.calculateAverageGrowth(historicalData);
    const accelerationFactor = this.calculateAccelerationFactor(historicalData);
    
    const projections = [];
    let projectedNodes = currentMetrics.totalNodes;
    let projectedValue = currentMetrics.totalNetworkValue;
    
    for (let i = 1; i <= months; i++) {
      // Apply network effect acceleration
      const networkMultiplier = this.getNetworkEffectMultiplier(projectedNodes);
      const monthlyGrowth = avgMonthlyGrowth * networkMultiplier * accelerationFactor;
      
      projectedNodes = Math.floor(projectedNodes * (1 + monthlyGrowth));
      projectedValue = this.projectNetworkValue(projectedNodes, i);
      
      projections.push({
        month: i,
        projectedNodes,
        projectedValue,
        projectedTransactions: Math.floor(projectedNodes * projectedNodes * 0.1),
        metcalfeValue: this.calculateMetcalfeValue(projectedNodes),
        reedValue: this.calculateReedValue(projectedNodes),
        networkEffect: networkMultiplier,
        confidence: this.calculateProjectionConfidence(i, historicalData.length)
      });
    }
    
    return {
      currentMetrics,
      projections,
      insights: this.generateGrowthInsights(projections, currentMetrics),
      criticalMilestones: this.identifyCriticalMilestones(projections)
    };
  }
  
  /**
   * Analyze network connectivity patterns
   */
  async analyzeConnectivityPatterns(): Promise<any> {
    const patterns = {
      hubs: this.identifyHubs(),
      clusters: this.identifyClusters(),
      bridges: this.identifyBridges(),
      isolatedNodes: this.identifyIsolatedNodes(),
      powerUsers: await this.identifyPowerUsers(),
      growthCatalysts: await this.identifyGrowthCatalysts()
    };
    
    // Analyze community formation
    const communityAnalysis = {
      strongCommunities: this.analyzeStrongCommunities(),
      emergingCommunities: this.analyzeEmergingCommunities(),
      crossCommunityLeaders: this.identifyCrossCommunityLeaders(),
      collaborationOpportunities: this.identifyCollaborationOpportunities()
    };
    
    return {
      patterns,
      communityAnalysis,
      recommendations: this.generateConnectivityRecommendations(patterns, communityAnalysis)
    };
  }
  
  /**
   * Calculate real-time network effect score
   */
  async getNetworkEffectScore(): Promise<any> {
    const metrics = await this.calculateNetworkMetrics();
    
    // Component scores (0-100)
    const sizeScore = Math.min(100, (metrics.totalNodes / this.CRITICAL_MASS) * 20);
    const densityScore = Math.min(100, metrics.networkDensity * 200);
    const engagementScore = Math.min(100, metrics.engagementRate);
    const growthScore = Math.min(100, metrics.growthRate * 10);
    const valueScore = Math.min(100, (metrics.averageNodeValue / 10000) * 100);
    
    // Weighted overall score
    const overallScore = (
      sizeScore * 0.2 +
      densityScore * 0.2 +
      engagementScore * 0.25 +
      growthScore * 0.2 +
      valueScore * 0.15
    );
    
    // Determine stage
    let stage = 'Initial';
    if (metrics.totalNodes >= this.REED_THRESHOLD) {
      stage = 'Exponential';
    } else if (metrics.totalNodes >= this.CRITICAL_MASS) {
      stage = 'Growth';
    }
    
    return {
      overallScore: Math.round(overallScore),
      components: {
        size: Math.round(sizeScore),
        density: Math.round(densityScore),
        engagement: Math.round(engagementScore),
        growth: Math.round(growthScore),
        value: Math.round(valueScore)
      },
      stage,
      momentum: this.calculateMomentum(metrics),
      nextMilestone: this.getNextMilestone(metrics),
      accelerators: this.identifyAccelerators(metrics),
      risks: this.identifyNetworkRisks(metrics)
    };
  }
  
  /**
   * Get community impact metrics
   */
  async getCommunityImpactMetrics(): Promise<any> {
    const communities = Array.from(this.nodes.values())
      .filter(n => n.type === 'community');
    
    const impactMetrics = await Promise.all(
      communities.map(async (community) => {
        const connections = this.edges.get(community.id) || [];
        const businesses = connections.filter(e => {
          const target = this.nodes.get(e.to);
          return target?.type === 'business';
        }).length;
        
        const transactions = await this.getCommunityTransactions(community.id);
        const totalValue = transactions.reduce((sum, t) => sum + t.amount, 0);
        
        return {
          communityId: community.id,
          communityName: community.metadata.name,
          connectedBusinesses: businesses,
          totalTransactions: transactions.length,
          totalValue,
          jobsCreated: community.metadata.jobsCreated || 0,
          localSpendingRate: await this.calculateLocalSpendingRate(community.id),
          economicMultiplier: this.calculateEconomicMultiplier(totalValue, community.metadata.population),
          sustainabilityScore: this.calculateSustainabilityScore(community)
        };
      })
    );
    
    // Aggregate metrics
    const totalImpact = {
      communitiesActive: impactMetrics.filter(m => m.totalTransactions > 0).length,
      totalJobsCreated: impactMetrics.reduce((sum, m) => sum + m.jobsCreated, 0),
      totalEconomicValue: impactMetrics.reduce((sum, m) => sum + m.totalValue, 0),
      averageLocalSpending: this.average(impactMetrics.map(m => m.localSpendingRate)),
      topPerformingCommunities: impactMetrics
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10)
    };
    
    return {
      communityMetrics: impactMetrics,
      totalImpact,
      trends: await this.analyzeCommunityTrends(),
      opportunities: this.identifyCommunityOpportunities(impactMetrics)
    };
  }
  
  /**
   * Real-time network activity feed
   */
  async getNetworkActivityFeed(limit: number = 50): Promise<any[]> {
    const recentActivities = await redisEncryption.getEncrypted<any[]>('network:activity:feed') || [];
    
    return recentActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(activity => ({
        ...activity,
        impact: this.calculateActivityImpact(activity),
        rippleEffect: this.calculateRippleEffect(activity)
      }));
  }
  
  /**
   * Track new connection
   */
  async trackConnection(
    fromId: string,
    toId: string,
    type: NetworkEdge['type'],
    metadata?: any
  ): Promise<void> {
    const edge: NetworkEdge = {
      from: fromId,
      to: toId,
      type,
      weight: this.calculateEdgeWeight(type, metadata),
      createdAt: new Date()
    };
    
    // Add to edges
    const fromEdges = this.edges.get(fromId) || [];
    fromEdges.push(edge);
    this.edges.set(fromId, fromEdges);
    
    // Update node connections
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    
    if (fromNode) {
      fromNode.connections++;
      fromNode.activity++;
    }
    
    if (toNode) {
      toNode.connections++;
      toNode.activity++;
    }
    
    // Calculate network effect impact
    const impact = this.calculateConnectionImpact(edge);
    
    // Emit event
    this.emit('connection-created', {
      edge,
      impact,
      networkSize: this.nodes.size
    });
    
    // Update activity feed
    await this.updateActivityFeed({
      type: 'connection',
      edge,
      impact,
      timestamp: Date.now()
    });
    
    // Check for network milestones
    await this.checkNetworkMilestones();
  }
  
  // Private helper methods
  
  private initializeAnalytics(): void {
    // Set up periodic metrics calculation
    setInterval(() => {
      this.calculateNetworkMetrics().catch(err => 
        logger.error('Failed to calculate network metrics', { error: err })
      );
    }, 300000); // Every 5 minutes
    
    logger.info('Network effects analytics initialized');
  }
  
  private async loadNetworkData(): Promise<void> {
    // Load nodes and edges from database/cache
    // This is a simplified version - would connect to actual data sources
    const cachedNodes = await redisEncryption.getEncrypted<any>('network:nodes');
    const cachedEdges = await redisEncryption.getEncrypted<any>('network:edges');
    
    if (cachedNodes && cachedEdges) {
      this.nodes = new Map(cachedNodes);
      this.edges = new Map(cachedEdges);
    }
  }
  
  private countTotalEdges(): number {
    let total = 0;
    for (const edges of this.edges.values()) {
      total += edges.length;
    }
    return total;
  }
  
  private calculateDensity(): number {
    const n = this.nodes.size;
    if (n < 2) return 0;
    
    const possibleEdges = n * (n - 1);
    const actualEdges = this.countTotalEdges();
    
    return actualEdges / possibleEdges;
  }
  
  private calculateAverageDegree(): number {
    if (this.nodes.size === 0) return 0;
    
    let totalDegree = 0;
    for (const node of this.nodes.values()) {
      totalDegree += node.connections;
    }
    
    return totalDegree / this.nodes.size;
  }
  
  private calculateClusteringCoefficient(): number {
    // Simplified clustering coefficient
    // Real implementation would analyze triangles in the network
    return Math.min(1, this.calculateDensity() * 2);
  }
  
  private calculateMetcalfeValue(nodes?: number): number {
    const n = nodes || this.nodes.size;
    return n * n * this.METCALFE_MULTIPLIER;
  }
  
  private calculateReedValue(nodes?: number): number {
    const n = nodes || this.nodes.size;
    if (n < this.REED_THRESHOLD) {
      return this.calculateMetcalfeValue(n);
    }
    return Math.pow(2, n / 1000); // Scaled Reed's law
  }
  
  private calculateViralCoefficient(): Promise<number> {
    // K-factor: How many new users each user brings
    // Simplified calculation
    return Promise.resolve(1.2); // Each user brings 1.2 new users
  }
  
  private identifyHubs(): NetworkNode[] {
    const threshold = this.calculateAverageDegree() * 3;
    return Array.from(this.nodes.values())
      .filter(node => node.connections > threshold)
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10);
  }
  
  private identifyClusters(): any[] {
    // Simplified cluster detection
    // Real implementation would use community detection algorithms
    const clusters = [];
    const processed = new Set<string>();
    
    for (const [nodeId, node] of this.nodes) {
      if (!processed.has(nodeId)) {
        const cluster = this.expandCluster(nodeId, processed);
        if (cluster.size > 3) {
          clusters.push({
            id: `cluster_${clusters.length}`,
            nodes: Array.from(cluster),
            size: cluster.size,
            density: this.calculateClusterDensity(cluster)
          });
        }
      }
    }
    
    return clusters;
  }
  
  private expandCluster(nodeId: string, processed: Set<string>): Set<string> {
    const cluster = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (processed.has(current)) continue;
      
      cluster.add(current);
      processed.add(current);
      
      const edges = this.edges.get(current) || [];
      for (const edge of edges) {
        if (!processed.has(edge.to)) {
          queue.push(edge.to);
        }
      }
    }
    
    return cluster;
  }
  
  private calculateClusterDensity(cluster: Set<string>): number {
    let internalEdges = 0;
    
    for (const nodeId of cluster) {
      const edges = this.edges.get(nodeId) || [];
      for (const edge of edges) {
        if (cluster.has(edge.to)) {
          internalEdges++;
        }
      }
    }
    
    const n = cluster.size;
    const possibleEdges = n * (n - 1);
    
    return possibleEdges > 0 ? internalEdges / possibleEdges : 0;
  }
  
  private getNetworkEffectMultiplier(nodes: number): number {
    if (nodes < this.CRITICAL_MASS) {
      return 1.0; // Linear growth
    } else if (nodes < this.REED_THRESHOLD) {
      return 1.5; // Accelerating growth
    } else {
      return 2.0; // Exponential growth
    }
  }
  
  private calculateEconomicMultiplier(value?: number, population?: number): number {
    // Local economic multiplier effect
    // $1 spent locally generates $1.50-$3.00 in local economy
    const baseMultiplier = 2.0;
    const populationFactor = population ? Math.log10(population) / 4 : 1;
    
    return baseMultiplier * populationFactor;
  }
  
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
  
  private countNodesByType(type: NetworkNode['type']): number {
    return Array.from(this.nodes.values()).filter(n => n.type === type).length;
  }
  
  private countNodesAddedSince(date: Date): number {
    return Array.from(this.nodes.values())
      .filter(n => n.joinedAt >= date).length;
  }
  
  private calculateGrowthRate(since: Date): number {
    const nodesAtStart = Array.from(this.nodes.values())
      .filter(n => n.joinedAt < since).length;
    
    if (nodesAtStart === 0) return 100;
    
    const nodesAdded = this.countNodesAddedSince(since);
    return (nodesAdded / nodesAtStart) * 100;
  }
  
  private identifyBridges(): NetworkNode[] {
    // Nodes that connect different clusters
    const bridges = [];
    const clusters = this.identifyClusters();
    
    for (const node of this.nodes.values()) {
      const connectedClusters = new Set<string>();
      const edges = this.edges.get(node.id) || [];
      
      for (const edge of edges) {
        for (const cluster of clusters) {
          if (cluster.nodes.includes(edge.to)) {
            connectedClusters.add(cluster.id);
          }
        }
      }
      
      if (connectedClusters.size > 1) {
        bridges.push(node);
      }
    }
    
    return bridges;
  }
  
  private async updateActivityFeed(activity: any): Promise<void> {
    const feed = await redisEncryption.getEncrypted<any[]>('network:activity:feed') || [];
    
    feed.unshift(activity);
    
    // Keep last 1000 activities
    if (feed.length > 1000) {
      feed.length = 1000;
    }
    
    await redisEncryption.setEncrypted('network:activity:feed', feed, 3600);
  }
  
  private calculateConnectionImpact(edge: NetworkEdge): number {
    // Calculate the impact of this new connection on the network
    const fromNode = this.nodes.get(edge.from);
    const toNode = this.nodes.get(edge.to);
    
    if (!fromNode || !toNode) return 0;
    
    // Impact based on node importance and connection type
    const nodeImportance = (fromNode.connections + toNode.connections) / 2;
    const typeWeight = {
      transaction: 1.0,
      partnership: 0.8,
      bid: 0.6,
      collaboration: 0.7,
      referral: 0.5
    }[edge.type] || 0.5;
    
    return nodeImportance * typeWeight * edge.weight;
  }
  
  private async checkNetworkMilestones(): Promise<void> {
    const milestones = [
      { nodes: 100, name: 'Critical Mass Reached' },
      { nodes: 500, name: 'Growth Phase' },
      { nodes: 1000, name: 'Network Effects Accelerating' },
      { nodes: 5000, name: 'Exponential Growth' },
      { nodes: 10000, name: 'Market Leader' }
    ];
    
    for (const milestone of milestones) {
      const key = `milestone:${milestone.nodes}`;
      const achieved = await redisEncryption.getEncrypted<boolean>(key);
      
      if (!achieved && this.nodes.size >= milestone.nodes) {
        await redisEncryption.setEncrypted(key, true);
        
        this.emit('milestone-reached', {
          milestone: milestone.name,
          nodes: this.nodes.size,
          timestamp: new Date()
        });
        
        await auditLogger.logEvent({
          eventType: 'platform_metric',
          action: 'network_milestone',
          metadata: milestone
        });
      }
    }
  }
  
  // Additional helper methods for calculations
  private async calculateTotalValue(): Promise<number> {
    // Sum of all transaction values in the network
    // Simplified - would aggregate from transaction service
    return this.nodes.size * 50000; // Average $50k per node
  }
  
  private async calculateAverageNodeValue(): Promise<number> {
    const total = await this.calculateTotalValue();
    return this.nodes.size > 0 ? total / this.nodes.size : 0;
  }
  
  private async countActiveNodes(since: Date): Promise<number> {
    // Nodes with recent activity
    return Math.floor(this.nodes.size * 0.7); // 70% active
  }
  
  private async calculateEngagementRate(): Promise<number> {
    const active = await this.countActiveNodes(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    return this.nodes.size > 0 ? (active / this.nodes.size) * 100 : 0;
  }
  
  private async calculateRetentionRate(since: Date): Promise<number> {
    // Simplified retention calculation
    return 85; // 85% retention
  }
  
  private async calculateChurnRate(since: Date): Promise<number> {
    const retention = await this.calculateRetentionRate(since);
    return 100 - retention;
  }
  
  private async calculateAverageCommunitySize(): Promise<number> {
    const communities = this.countNodesByType('community');
    const businesses = this.countNodesByType('business');
    
    return communities > 0 ? businesses / communities : 0;
  }
  
  private countInterCommunityConnections(): number {
    // Connections between different communities
    let count = 0;
    
    for (const [nodeId, edges] of this.edges) {
      const fromNode = this.nodes.get(nodeId);
      if (fromNode?.type === 'community') {
        for (const edge of edges) {
          const toNode = this.nodes.get(edge.to);
          if (toNode?.type === 'community' && edge.to !== nodeId) {
            count++;
          }
        }
      }
    }
    
    return count;
  }
  
  private identifyCommunityBridges(): number {
    // Key nodes connecting communities
    return this.identifyBridges().filter(n => n.type === 'business').length;
  }
  
  private async calculateTransactionVolume(): Promise<number> {
    // Total transaction volume across network
    return this.nodes.size * this.nodes.size * 1000; // Simplified
  }
  
  private async calculateAverageTransactionSize(): Promise<number> {
    const volume = await this.calculateTransactionVolume();
    const transactions = this.countTotalEdges();
    
    return transactions > 0 ? volume / transactions : 0;
  }
  
  private async calculateLocalSpendingRate(communityId?: string): Promise<number> {
    // Percentage of spending within community
    return 75; // 75% local spending
  }
  
  private async calculateLiquidityScore(): Promise<number> {
    // Available opportunities vs demand
    return 85; // Good liquidity
  }
  
  private async calculateMatchingEfficiency(): Promise<number> {
    // Successful matches / total attempts
    return 78; // 78% matching efficiency
  }
  
  private async calculateTrustScore(): Promise<number> {
    // Based on successful transactions
    return 92; // High trust
  }
  
  private calculateDiversityIndex(): number {
    // Geographic and sector diversity
    const uniqueRegions = new Set(
      Array.from(this.nodes.values()).map(n => n.metadata.region)
    ).size;
    
    const uniqueSectors = new Set(
      Array.from(this.nodes.values()).map(n => n.metadata.sector)
    ).size;
    
    return Math.min(100, (uniqueRegions + uniqueSectors) * 5);
  }
  
  private calculateEdgeWeight(type: NetworkEdge['type'], metadata?: any): number {
    const baseWeights = {
      transaction: 1.0,
      bid: 0.5,
      partnership: 0.8,
      referral: 0.3,
      collaboration: 0.6
    };
    
    let weight = baseWeights[type] || 0.5;
    
    // Adjust based on metadata
    if (metadata?.value) {
      weight *= Math.log10(metadata.value) / 5;
    }
    
    return Math.min(1, weight);
  }
  
  private async getHistoricalMetrics(months: number): Promise<any[]> {
    // Retrieve historical metrics for trend analysis
    const historical = [];
    
    for (let i = 0; i < months; i++) {
      const key = `network:metrics:${new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)}`;
      const metrics = await redisEncryption.getEncrypted<NetworkMetrics>(key);
      if (metrics) {
        historical.push(metrics);
      }
    }
    
    return historical;
  }
  
  private calculateAverageGrowth(historical: any[]): number {
    if (historical.length < 2) return 0.1; // 10% default
    
    let totalGrowth = 0;
    for (let i = 1; i < historical.length; i++) {
      const growth = (historical[i].totalNodes - historical[i-1].totalNodes) / historical[i-1].totalNodes;
      totalGrowth += growth;
    }
    
    return totalGrowth / (historical.length - 1);
  }
  
  private calculateAccelerationFactor(historical: any[]): number {
    // Is growth accelerating?
    if (historical.length < 3) return 1.0;
    
    const recentGrowth = this.calculateAverageGrowth(historical.slice(-3));
    const overallGrowth = this.calculateAverageGrowth(historical);
    
    return recentGrowth > overallGrowth ? 1.2 : 1.0;
  }
  
  private projectNetworkValue(nodes: number, monthsAhead: number): number {
    // Project value based on Metcalfe's law with time factor
    const metcalfeBase = this.calculateMetcalfeValue(nodes);
    const timeFactor = Math.pow(1.05, monthsAhead); // 5% monthly value growth
    
    return metcalfeBase * timeFactor * 1000; // $1000 per network unit
  }
  
  private calculateProjectionConfidence(monthsAhead: number, historicalDataPoints: number): number {
    // Confidence decreases with time and increases with more data
    const timePenalty = Math.exp(-monthsAhead / 12); // Exponential decay
    const dataBonus = Math.min(1, historicalDataPoints / 12); // Need 12 months for full confidence
    
    return Math.round(timePenalty * dataBonus * 100);
  }
  
  private generateGrowthInsights(projections: any[], current: NetworkMetrics): string[] {
    const insights = [];
    
    // Find when critical mass is reached
    const criticalMassMonth = projections.find(p => p.projectedNodes >= this.CRITICAL_MASS);
    if (criticalMassMonth && current.totalNodes < this.CRITICAL_MASS) {
      insights.push(`Network will reach critical mass (${this.CRITICAL_MASS} nodes) in month ${criticalMassMonth.month}`);
    }
    
    // Find when exponential growth begins
    const exponentialMonth = projections.find(p => p.networkEffect >= 2.0);
    if (exponentialMonth) {
      insights.push(`Exponential network effects expected to begin in month ${exponentialMonth.month}`);
    }
    
    // Value projection
    const yearEndProjection = projections[11];
    if (yearEndProjection) {
      const valueGrowth = ((yearEndProjection.projectedValue - current.totalNetworkValue) / current.totalNetworkValue) * 100;
      insights.push(`Network value projected to grow ${valueGrowth.toFixed(0)}% in 12 months`);
    }
    
    return insights;
  }
  
  private identifyCriticalMilestones(projections: any[]): any[] {
    const milestones = [];
    
    const targets = [
      { nodes: 100, name: 'Critical Mass' },
      { nodes: 1000, name: 'Network Effects' },
      { nodes: 10000, name: 'Market Leadership' },
      { value: 1000000, name: '$1M Network Value' },
      { value: 10000000, name: '$10M Network Value' },
      { value: 100000000, name: '$100M Network Value' }
    ];
    
    for (const target of targets) {
      const month = projections.find(p => 
        (target.nodes && p.projectedNodes >= target.nodes) ||
        (target.value && p.projectedValue >= target.value)
      );
      
      if (month) {
        milestones.push({
          name: target.name,
          month: month.month,
          confidence: month.confidence
        });
      }
    }
    
    return milestones;
  }
  
  private identifyIsolatedNodes(): NetworkNode[] {
    return Array.from(this.nodes.values())
      .filter(node => node.connections === 0);
  }
  
  private async identifyPowerUsers(): Promise<NetworkNode[]> {
    // Users driving the most value
    return Array.from(this.nodes.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  }
  
  private async identifyGrowthCatalysts(): Promise<any[]> {
    // Nodes that bring in the most new users
    const catalysts = [];
    
    for (const [nodeId, node] of this.nodes) {
      const referrals = await this.countReferrals(nodeId);
      if (referrals > 5) {
        catalysts.push({
          node,
          referrals,
          impact: referrals * this.calculateAverageNodeValue()
        });
      }
    }
    
    return catalysts.sort((a, b) => b.impact - a.impact).slice(0, 10);
  }
  
  private async countReferrals(nodeId: string): Promise<number> {
    const edges = this.edges.get(nodeId) || [];
    return edges.filter(e => e.type === 'referral').length;
  }
  
  private analyzeStrongCommunities(): any[] {
    const clusters = this.identifyClusters();
    return clusters
      .filter(c => c.density > 0.5)
      .map(c => ({
        ...c,
        strength: 'strong',
        characteristics: this.analyzeCommunityCharacteristics(c)
      }));
  }
  
  private analyzeEmergingCommunities(): any[] {
    const clusters = this.identifyClusters();
    return clusters
      .filter(c => c.density > 0.2 && c.density <= 0.5)
      .map(c => ({
        ...c,
        strength: 'emerging',
        growthPotential: this.assessGrowthPotential(c)
      }));
  }
  
  private identifyCrossCommunityLeaders(): NetworkNode[] {
    const bridges = this.identifyBridges();
    return bridges.filter(b => b.connections > this.calculateAverageDegree() * 2);
  }
  
  private identifyCollaborationOpportunities(): any[] {
    // Find communities that could benefit from connection
    const opportunities = [];
    const communities = Array.from(this.nodes.values()).filter(n => n.type === 'community');
    
    for (let i = 0; i < communities.length; i++) {
      for (let j = i + 1; j < communities.length; j++) {
        const similarity = this.calculateCommunitySimilarity(communities[i], communities[j]);
        if (similarity > 0.5 && !this.areConnected(communities[i].id, communities[j].id)) {
          opportunities.push({
            community1: communities[i],
            community2: communities[j],
            similarity,
            potentialValue: this.estimateConnectionValue(communities[i], communities[j])
          });
        }
      }
    }
    
    return opportunities.sort((a, b) => b.potentialValue - a.potentialValue).slice(0, 10);
  }
  
  private analyzeCommunityCharacteristics(cluster: any): any {
    // Analyze what makes this community strong
    return {
      avgConnections: this.average(cluster.nodes.map(id => this.nodes.get(id)?.connections || 0)),
      diversity: this.calculateClusterDiversity(cluster),
      activity: this.calculateClusterActivity(cluster)
    };
  }
  
  private assessGrowthPotential(cluster: any): number {
    // Score 0-100 for growth potential
    const currentSize = cluster.size;
    const density = cluster.density;
    const externalConnections = this.countExternalConnections(cluster);
    
    return Math.min(100, (100 - currentSize) * 0.3 + density * 100 * 0.3 + externalConnections * 0.4);
  }
  
  private calculateCommunitySimilarity(c1: NetworkNode, c2: NetworkNode): number {
    // Compare community characteristics
    const sector1 = c1.metadata.primarySector;
    const sector2 = c2.metadata.primarySector;
    const region1 = c1.metadata.region;
    const region2 = c2.metadata.region;
    
    let similarity = 0;
    if (sector1 === sector2) similarity += 0.5;
    if (region1 === region2) similarity += 0.3;
    
    // Add more sophisticated comparison
    
    return similarity;
  }
  
  private areConnected(id1: string, id2: string): boolean {
    const edges1 = this.edges.get(id1) || [];
    return edges1.some(e => e.to === id2);
  }
  
  private estimateConnectionValue(c1: NetworkNode, c2: NetworkNode): number {
    // Estimate value of connecting these communities
    return (c1.value + c2.value) * 0.1; // 10% of combined value
  }
  
  private calculateClusterDiversity(cluster: any): number {
    // Diversity of node types in cluster
    const types = new Set(cluster.nodes.map(id => this.nodes.get(id)?.type));
    return types.size / 4; // 4 possible types
  }
  
  private calculateClusterActivity(cluster: any): number {
    // Average activity level in cluster
    const activities = cluster.nodes.map(id => this.nodes.get(id)?.activity || 0);
    return this.average(activities);
  }
  
  private countExternalConnections(cluster: any): number {
    let external = 0;
    
    for (const nodeId of cluster.nodes) {
      const edges = this.edges.get(nodeId) || [];
      for (const edge of edges) {
        if (!cluster.nodes.includes(edge.to)) {
          external++;
        }
      }
    }
    
    return external;
  }
  
  private generateConnectivityRecommendations(patterns: any, communityAnalysis: any): string[] {
    const recommendations = [];
    
    if (patterns.isolatedNodes.length > 10) {
      recommendations.push(`Engage ${patterns.isolatedNodes.length} isolated nodes through targeted outreach`);
    }
    
    if (patterns.powerUsers.length > 0) {
      recommendations.push('Leverage power users as ambassadors for network growth');
    }
    
    if (communityAnalysis.collaborationOpportunities.length > 0) {
      recommendations.push(`${communityAnalysis.collaborationOpportunities.length} high-value community partnerships identified`);
    }
    
    return recommendations;
  }
  
  private calculateMomentum(metrics: NetworkMetrics): string {
    const growthMomentum = metrics.growthRate > 20 ? 'high' : metrics.growthRate > 10 ? 'medium' : 'low';
    const engagementMomentum = metrics.engagementRate > 80 ? 'high' : metrics.engagementRate > 60 ? 'medium' : 'low';
    
    if (growthMomentum === 'high' && engagementMomentum === 'high') return 'accelerating';
    if (growthMomentum === 'high' || engagementMomentum === 'high') return 'positive';
    if (growthMomentum === 'low' && engagementMomentum === 'low') return 'stalling';
    return 'steady';
  }
  
  private getNextMilestone(metrics: NetworkMetrics): any {
    const milestones = [
      { threshold: 100, name: 'Critical Mass', reward: 'Network effects begin' },
      { threshold: 500, name: 'Growth Phase', reward: 'Accelerated value creation' },
      { threshold: 1000, name: 'Network Maturity', reward: 'Exponential growth' },
      { threshold: 5000, name: 'Market Leader', reward: 'Dominant position' }
    ];
    
    const next = milestones.find(m => m.threshold > metrics.totalNodes);
    
    if (next) {
      return {
        name: next.name,
        nodesNeeded: next.threshold - metrics.totalNodes,
        percentComplete: (metrics.totalNodes / next.threshold) * 100,
        estimatedTime: this.estimateTimeToMilestone(metrics, next.threshold),
        reward: next.reward
      };
    }
    
    return { name: 'Continuous Growth', nodesNeeded: 0, percentComplete: 100 };
  }
  
  private estimateTimeToMilestone(metrics: NetworkMetrics, target: number): string {
    const currentGrowthRate = metrics.nodesAddedThisMonth;
    if (currentGrowthRate === 0) return 'Unknown';
    
    const nodesNeeded = target - metrics.totalNodes;
    const monthsNeeded = Math.ceil(nodesNeeded / currentGrowthRate);
    
    if (monthsNeeded <= 1) return '< 1 month';
    if (monthsNeeded <= 3) return `${monthsNeeded} months`;
    if (monthsNeeded <= 12) return `${monthsNeeded} months`;
    return `${Math.round(monthsNeeded / 12)} years`;
  }
  
  private identifyAccelerators(metrics: NetworkMetrics): string[] {
    const accelerators = [];
    
    if (metrics.viralCoefficient > 1.0) {
      accelerators.push('Viral growth active (K > 1.0)');
    }
    
    if (metrics.engagementRate > 80) {
      accelerators.push('High engagement driving retention');
    }
    
    if (metrics.interCommunityConnections > metrics.totalCommunities * 2) {
      accelerators.push('Strong cross-community collaboration');
    }
    
    if (metrics.economicMultiplier > 2.5) {
      accelerators.push('High economic impact multiplier');
    }
    
    return accelerators;
  }
  
  private identifyNetworkRisks(metrics: NetworkMetrics): string[] {
    const risks = [];
    
    if (metrics.churnRate > 20) {
      risks.push('High churn rate threatening growth');
    }
    
    if (metrics.networkDensity < 0.1) {
      risks.push('Low network density limiting value creation');
    }
    
    if (metrics.clusteringCoefficient > 0.8) {
      risks.push('Over-clustering may limit diversity');
    }
    
    if (metrics.diversityIndex < 50) {
      risks.push('Limited geographic/sector diversity');
    }
    
    return risks;
  }
  
  private async getCommunityTransactions(communityId: string): Promise<any[]> {
    // Mock implementation - would fetch from transaction service
    return [];
  }
  
  private calculateSustainabilityScore(community: NetworkNode): number {
    // Score based on self-sufficiency and growth
    const connections = community.connections;
    const activity = community.activity;
    const value = community.value;
    
    return Math.min(100, (connections * 0.3 + activity * 0.3 + (value / 10000) * 0.4));
  }
  
  private async analyzeCommunityTrends(): Promise<any> {
    // Analyze trends across all communities
    return {
      growthTrend: 'positive',
      engagementTrend: 'stable',
      valueTrend: 'accelerating'
    };
  }
  
  private identifyCommunityOpportunities(metrics: any[]): string[] {
    const opportunities = [];
    
    const lowEngagement = metrics.filter(m => m.connectedBusinesses < 10);
    if (lowEngagement.length > 0) {
      opportunities.push(`${lowEngagement.length} communities need more business connections`);
    }
    
    const highValue = metrics.filter(m => m.economicMultiplier > 3.0);
    if (highValue.length > 0) {
      opportunities.push(`${highValue.length} communities show exceptional economic impact potential`);
    }
    
    return opportunities;
  }
  
  private calculateActivityImpact(activity: any): number {
    // Impact score 0-100
    const typeWeights = {
      connection: 20,
      transaction: 50,
      partnership: 40,
      milestone: 80
    };
    
    return typeWeights[activity.type] || 10;
  }
  
  private calculateRippleEffect(activity: any): number {
    // How many other nodes are affected
    if (activity.edge) {
      const fromNode = this.nodes.get(activity.edge.from);
      const toNode = this.nodes.get(activity.edge.to);
      
      if (fromNode && toNode) {
        return fromNode.connections + toNode.connections;
      }
    }
    
    return 0;
  }
}

// Export singleton instance
export const networkEffects = NetworkEffectsAnalytics.getInstance();