/**
 * Relationship Graph Builder
 * Maps and analyzes business relationships for strategic insights
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import * as neo4j from 'neo4j-driver';
import { OpenAI } from 'openai';
import { createLogger } from '../core/utils/logger';
import {
  EnrichedBusiness,
  BusinessType,
  BusinessRelationship,
  RelationshipType
} from '../types';
import {
  RelationshipGraph,
  GraphNode,
  GraphEdge,
  CommunityCluster,
  InfluenceScore,
  NetworkMetrics
} from '../types/enhanced-types';

export interface GraphBuilderConfig {
  neo4jUri?: string;
  neo4jUser?: string;
  neo4jPassword?: string;
  enableNeo4j: boolean;
  enableCommunityDetection: boolean;
  enableInfluenceAnalysis: boolean;
  maxDepth: number;
  relationshipWeights: Record<RelationshipType, number>;
}

export interface RelationshipInsight {
  type: 'opportunity' | 'risk' | 'influence' | 'cluster';
  title: string;
  description: string;
  score: number;
  affectedNodes: string[];
  recommendations: string[];
}

export interface NetworkAnalysis {
  centralityScores: Map<string, number>;
  communities: CommunityCluster[];
  bridgeNodes: string[];
  isolatedNodes: string[];
  stronglyConnected: string[][];
}

export interface PathAnalysis {
  shortestPath: GraphNode[];
  alternativePaths: GraphNode[][];
  pathStrength: number;
  intermediaries: GraphNode[];
}

export class RelationshipGraphBuilder extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly openai: OpenAI;
  private readonly config: GraphBuilderConfig;
  private neo4jDriver?: neo4j.Driver;
  private graphCache: Map<string, RelationshipGraph>;

  constructor(redis: Redis, config?: Partial<GraphBuilderConfig>) {
    super();
    this.logger = createLogger('relationship-graph-builder');
    this.redis = redis;
    this.graphCache = new Map();

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Default configuration
    this.config = {
      enableNeo4j: false,
      enableCommunityDetection: true,
      enableInfluenceAnalysis: true,
      maxDepth: 3,
      relationshipWeights: {
        [RelationshipType.SUPPLIER]: 0.8,
        [RelationshipType.CUSTOMER]: 0.8,
        [RelationshipType.PARTNER]: 0.9,
        [RelationshipType.COMPETITOR]: 0.6,
        [RelationshipType.INVESTOR]: 0.7,
        [RelationshipType.SUBSIDIARY]: 1.0,
        [RelationshipType.PARENT]: 1.0
      },
      ...config
    };

    this.initializeNeo4j();
  }

  /**
   * Build relationship graph for a business
   */
  async buildBusinessGraph(
    business: EnrichedBusiness,
    depth: number = 1
  ): Promise<RelationshipGraph> {
    this.logger.info(`Building relationship graph for ${business.name}`);

    try {
      // Check cache
      const cached = await this.getCachedGraph(business.id);
      if (cached) {
        return cached;
      }

      // Initialize graph
      const nodes = new Map<string, GraphNode>();
      const edges: GraphEdge[] = [];

      // Add root node
      const rootNode: GraphNode = {
        id: business.id,
        businessName: business.name,
        businessType: business.type,
        industry: business.industry || [],
        size: this.calculateNodeSize(business),
        influence: 1.0,
        depth: 0
      };
      nodes.set(business.id, rootNode);

      // Discover relationships recursively
      await this.discoverRelationships(
        business,
        nodes,
        edges,
        0,
        Math.min(depth, this.config.maxDepth)
      );

      // Analyze network
      const analysis = await this.analyzeNetwork(nodes, edges);

      // Generate insights
      const insights = await this.generateInsights(nodes, edges, analysis);

      const graph: RelationshipGraph = {
        rootBusinessId: business.id,
        nodes: Array.from(nodes.values()),
        edges,
        metrics: this.calculateNetworkMetrics(nodes, edges),
        communities: analysis.communities,
        insights,
        generatedAt: new Date()
      };

      // Cache the graph
      await this.cacheGraph(business.id, graph);

      // Store in Neo4j if enabled
      if (this.config.enableNeo4j && this.neo4jDriver) {
        await this.storeInNeo4j(graph);
      }

      this.emit('graph:built', {
        businessId: business.id,
        nodeCount: nodes.size,
        edgeCount: edges.length
      });

      return graph;

    } catch (error) {
      this.logger.error(`Failed to build graph for ${business.name}:`, error);
      throw error;
    }
  }

  /**
   * Find paths between businesses
   */
  async findPaths(
    sourceId: string,
    targetId: string,
    maxPaths: number = 3
  ): Promise<PathAnalysis> {
    if (this.config.enableNeo4j && this.neo4jDriver) {
      return await this.findPathsNeo4j(sourceId, targetId, maxPaths);
    }

    // Fallback to in-memory graph traversal
    return await this.findPathsInMemory(sourceId, targetId, maxPaths);
  }

  /**
   * Analyze business ecosystem
   */
  async analyzeEcosystem(
    businessIds: string[]
  ): Promise<{
    graph: RelationshipGraph;
    clusters: CommunityCluster[];
    keyPlayers: GraphNode[];
    opportunities: RelationshipInsight[];
  }> {
    this.logger.info(`Analyzing ecosystem for ${businessIds.length} businesses`);

    try {
      // Build combined graph
      const allNodes = new Map<string, GraphNode>();
      const allEdges: GraphEdge[] = [];

      for (const businessId of businessIds) {
        const business = await this.getBusinessData(businessId);
        if (!business) continue;

        const subGraph = await this.buildBusinessGraph(business, 2);
        
        // Merge nodes
        for (const node of subGraph.nodes) {
          if (!allNodes.has(node.id)) {
            allNodes.set(node.id, node);
          }
        }

        // Merge edges
        for (const edge of subGraph.edges) {
          const exists = allEdges.some(e => 
            e.source === edge.source && 
            e.target === edge.target &&
            e.type === edge.type
          );
          if (!exists) {
            allEdges.push(edge);
          }
        }
      }

      // Analyze the ecosystem
      const analysis = await this.analyzeNetwork(allNodes, allEdges);

      // Identify key players
      const keyPlayers = this.identifyKeyPlayers(allNodes, analysis);

      // Find opportunities
      const opportunities = await this.findEcosystemOpportunities(
        allNodes,
        allEdges,
        analysis
      );

      const ecosystemGraph: RelationshipGraph = {
        rootBusinessId: 'ecosystem',
        nodes: Array.from(allNodes.values()),
        edges: allEdges,
        metrics: this.calculateNetworkMetrics(allNodes, allEdges),
        communities: analysis.communities,
        insights: opportunities,
        generatedAt: new Date()
      };

      return {
        graph: ecosystemGraph,
        clusters: analysis.communities,
        keyPlayers,
        opportunities
      };

    } catch (error) {
      this.logger.error('Ecosystem analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get influence score for a business
   */
  async calculateInfluenceScore(
    businessId: string
  ): Promise<InfluenceScore> {
    const graph = await this.getOrBuildGraph(businessId);
    
    const node = graph.nodes.find(n => n.id === businessId);
    if (!node) {
      throw new Error(`Business ${businessId} not found in graph`);
    }

    // Calculate various influence metrics
    const directConnections = graph.edges.filter(
      e => e.source === businessId || e.target === businessId
    ).length;

    const indirectConnections = this.countIndirectConnections(
      businessId,
      graph,
      2
    );

    const centralityScore = await this.calculateCentrality(
      businessId,
      graph
    );

    const bridgeScore = this.calculateBridgeScore(
      businessId,
      graph
    );

    const communityInfluence = this.calculateCommunityInfluence(
      businessId,
      graph
    );

    // Combine scores
    const overallScore = (
      centralityScore * 0.3 +
      bridgeScore * 0.2 +
      communityInfluence * 0.2 +
      (directConnections / graph.nodes.length) * 0.15 +
      (indirectConnections / graph.nodes.length) * 0.15
    );

    return {
      businessId,
      overallScore: Math.min(overallScore, 1.0),
      metrics: {
        centrality: centralityScore,
        bridging: bridgeScore,
        reach: indirectConnections,
        community: communityInfluence
      },
      rank: await this.getInfluenceRank(businessId, overallScore),
      topConnections: this.getTopConnections(businessId, graph, 5)
    };
  }

  /**
   * Discover relationships for a business
   */
  private async discoverRelationships(
    business: EnrichedBusiness,
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    // Get known relationships
    const relationships = await this.getBusinessRelationships(business.id);

    for (const rel of relationships) {
      const relatedId = rel.targetBusinessId;
      
      // Skip if already processed
      if (nodes.has(relatedId)) {
        // Just add edge
        edges.push({
          source: business.id,
          target: relatedId,
          type: rel.type,
          weight: this.config.relationshipWeights[rel.type] || 0.5,
          metadata: rel.metadata
        });
        continue;
      }

      // Get related business data
      const relatedBusiness = await this.getBusinessData(relatedId);
      if (!relatedBusiness) continue;

      // Add node
      const node: GraphNode = {
        id: relatedId,
        businessName: relatedBusiness.name,
        businessType: relatedBusiness.type,
        industry: relatedBusiness.industry || [],
        size: this.calculateNodeSize(relatedBusiness),
        influence: 0, // Will be calculated later
        depth: currentDepth + 1
      };
      nodes.set(relatedId, node);

      // Add edge
      edges.push({
        source: business.id,
        target: relatedId,
        type: rel.type,
        weight: this.config.relationshipWeights[rel.type] || 0.5,
        metadata: rel.metadata
      });

      // Recursively discover
      await this.discoverRelationships(
        relatedBusiness,
        nodes,
        edges,
        currentDepth + 1,
        maxDepth
      );
    }

    // Infer relationships if enabled
    if (currentDepth < maxDepth - 1) {
      const inferred = await this.inferRelationships(business);
      for (const inf of inferred) {
        if (!nodes.has(inf.targetBusinessId)) {
          const relatedBusiness = await this.getBusinessData(inf.targetBusinessId);
          if (relatedBusiness) {
            await this.discoverRelationships(
              relatedBusiness,
              nodes,
              edges,
              currentDepth + 1,
              maxDepth
            );
          }
        }
      }
    }
  }

  /**
   * Analyze network structure
   */
  private async analyzeNetwork(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): Promise<NetworkAnalysis> {
    // Build adjacency lists
    const adjacency = this.buildAdjacencyList(nodes, edges);

    // Calculate centrality scores
    const centralityScores = this.calculateCentralityScores(nodes, adjacency);

    // Detect communities
    const communities = this.config.enableCommunityDetection
      ? await this.detectCommunities(nodes, edges)
      : [];

    // Find bridge nodes
    const bridgeNodes = this.findBridgeNodes(nodes, edges);

    // Find isolated nodes
    const isolatedNodes = Array.from(nodes.keys()).filter(
      nodeId => !edges.some(e => e.source === nodeId || e.target === nodeId)
    );

    // Find strongly connected components
    const stronglyConnected = this.findStronglyConnected(nodes, adjacency);

    return {
      centralityScores,
      communities,
      bridgeNodes,
      isolatedNodes,
      stronglyConnected
    };
  }

  /**
   * Generate insights from graph analysis
   */
  private async generateInsights(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    analysis: NetworkAnalysis
  ): Promise<RelationshipInsight[]> {
    const insights: RelationshipInsight[] = [];

    // Partnership opportunities
    const partnershipOps = this.findPartnershipOpportunities(nodes, edges);
    insights.push(...partnershipOps);

    // Supply chain insights
    const supplyChainInsights = this.analyzeSupplyChain(nodes, edges);
    insights.push(...supplyChainInsights);

    // Community insights
    if (analysis.communities.length > 0) {
      const communityInsights = this.analyzeCommunities(analysis.communities, nodes);
      insights.push(...communityInsights);
    }

    // Risk analysis
    const risks = this.identifyRisks(nodes, edges, analysis);
    insights.push(...risks);

    // AI-powered insights
    if (insights.length < 5) {
      const aiInsights = await this.generateAIInsights(nodes, edges);
      insights.push(...aiInsights);
    }

    // Sort by score
    insights.sort((a, b) => b.score - a.score);

    return insights.slice(0, 10); // Top 10 insights
  }

  /**
   * Find partnership opportunities
   */
  private findPartnershipOpportunities(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): RelationshipInsight[] {
    const opportunities: RelationshipInsight[] = [];

    // Find nodes with complementary industries
    const nodeArray = Array.from(nodes.values());
    
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const node1 = nodeArray[i];
        const node2 = nodeArray[j];

        // Skip if already connected
        if (this.areConnected(node1.id, node2.id, edges)) continue;

        // Check for complementary industries
        const synergy = this.calculateIndustrySynergy(
          node1.industry,
          node2.industry
        );

        if (synergy > 0.6) {
          opportunities.push({
            type: 'opportunity',
            title: 'Partnership Opportunity',
            description: `${node1.businessName} and ${node2.businessName} have complementary capabilities`,
            score: synergy,
            affectedNodes: [node1.id, node2.id],
            recommendations: [
              `Introduce ${node1.businessName} to ${node2.businessName}`,
              `Explore joint venture opportunities`,
              `Consider supply chain integration`
            ]
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Helper methods
   */
  private initializeNeo4j(): void {
    if (this.config.enableNeo4j && 
        this.config.neo4jUri && 
        this.config.neo4jUser && 
        this.config.neo4jPassword) {
      try {
        this.neo4jDriver = neo4j.driver(
          this.config.neo4jUri,
          neo4j.auth.basic(this.config.neo4jUser, this.config.neo4jPassword)
        );
        this.logger.info('Neo4j driver initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Neo4j:', error);
      }
    }
  }

  private calculateNodeSize(business: EnrichedBusiness): number {
    // Base size on employee count or revenue
    if (business.financialInfo?.employeeCount) {
      const employees = business.financialInfo.employeeCount;
      if (employees > 500) return 1.0;
      if (employees > 100) return 0.8;
      if (employees > 50) return 0.6;
      if (employees > 10) return 0.4;
      return 0.2;
    }
    return 0.5; // Default
  }

  private async getBusinessRelationships(
    businessId: string
  ): Promise<BusinessRelationship[]> {
    const key = `relationships:${businessId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }

    // Infer from available data
    return await this.inferRelationships(
      await this.getBusinessData(businessId) as EnrichedBusiness
    );
  }

  private async inferRelationships(
    business: EnrichedBusiness
  ): Promise<BusinessRelationship[]> {
    const relationships: BusinessRelationship[] = [];

    // Infer from description and industry
    if (business.description) {
      // Look for supplier mentions
      const supplierPattern = /supplier|vendor|sourced from|partner/gi;
      const matches = business.description.match(supplierPattern);
      
      if (matches) {
        // This would need more sophisticated NLP in production
        this.logger.debug(`Inferred ${matches.length} potential relationships`);
      }
    }

    return relationships;
  }

  private buildAdjacencyList(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();
    
    for (const node of nodes.keys()) {
      adjacency.set(node, new Set());
    }

    for (const edge of edges) {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    }

    return adjacency;
  }

  private calculateCentralityScores(
    nodes: Map<string, GraphNode>,
    adjacency: Map<string, Set<string>>
  ): Map<string, number> {
    const scores = new Map<string, number>();

    // Degree centrality
    for (const [nodeId, neighbors] of adjacency) {
      scores.set(nodeId, neighbors.size / (nodes.size - 1));
    }

    return scores;
  }

  private async detectCommunities(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): Promise<CommunityCluster[]> {
    // Simplified community detection
    // In production, use algorithms like Louvain or Label Propagation
    
    const communities: CommunityCluster[] = [];
    const visited = new Set<string>();

    for (const [nodeId] of nodes) {
      if (visited.has(nodeId)) continue;

      const community = this.exploreCommunity(
        nodeId,
        nodes,
        edges,
        visited
      );

      if (community.members.length > 1) {
        communities.push({
          id: `community-${communities.length}`,
          members: community.members,
          cohesion: community.cohesion,
          centralNode: community.centralNode,
          characteristics: this.analyzeClusterCharacteristics(
            community.members,
            nodes
          )
        });
      }
    }

    return communities;
  }

  private exploreCommunity(
    startNode: string,
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    visited: Set<string>
  ): { members: string[]; cohesion: number; centralNode: string } {
    const members: string[] = [];
    const queue = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      members.push(current);

      // Find neighbors
      const neighbors = edges
        .filter(e => e.source === current || e.target === current)
        .map(e => e.source === current ? e.target : e.source)
        .filter(n => !visited.has(n));

      for (const neighbor of neighbors) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    // Calculate cohesion
    const internalEdges = edges.filter(
      e => members.includes(e.source) && members.includes(e.target)
    ).length;
    const possibleEdges = (members.length * (members.length - 1)) / 2;
    const cohesion = possibleEdges > 0 ? internalEdges / possibleEdges : 0;

    // Find central node
    const centralNode = members[0]; // Simplified

    return { members, cohesion, centralNode };
  }

  private analyzeClusterCharacteristics(
    members: string[],
    nodes: Map<string, GraphNode>
  ): Record<string, any> {
    const industries = new Map<string, number>();
    const types = new Map<string, number>();

    for (const memberId of members) {
      const node = nodes.get(memberId);
      if (!node) continue;

      // Count industries
      for (const industry of node.industry) {
        industries.set(industry, (industries.get(industry) || 0) + 1);
      }

      // Count types
      types.set(node.businessType, (types.get(node.businessType) || 0) + 1);
    }

    return {
      dominantIndustries: Array.from(industries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([ind]) => ind),
      businessTypes: Object.fromEntries(types),
      size: members.length
    };
  }

  private findBridgeNodes(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): string[] {
    // Find nodes that connect different communities
    // Simplified implementation
    const bridgeNodes: string[] = [];

    for (const [nodeId] of nodes) {
      const neighbors = edges
        .filter(e => e.source === nodeId || e.target === nodeId)
        .map(e => e.source === nodeId ? e.target : e.source);

      if (neighbors.length >= 3) {
        // Check if neighbors are not connected to each other
        let bridgeScore = 0;
        for (let i = 0; i < neighbors.length; i++) {
          for (let j = i + 1; j < neighbors.length; j++) {
            if (!this.areConnected(neighbors[i], neighbors[j], edges)) {
              bridgeScore++;
            }
          }
        }

        if (bridgeScore > neighbors.length / 2) {
          bridgeNodes.push(nodeId);
        }
      }
    }

    return bridgeNodes;
  }

  private findStronglyConnected(
    nodes: Map<string, GraphNode>,
    adjacency: Map<string, Set<string>>
  ): string[][] {
    // Simplified - find groups of 3+ nodes that are all connected
    const components: string[][] = [];
    const processed = new Set<string>();

    for (const [nodeId, neighbors] of adjacency) {
      if (processed.has(nodeId) || neighbors.size < 2) continue;

      const component = [nodeId];
      
      for (const neighbor of neighbors) {
        const neighborConnections = adjacency.get(neighbor) || new Set();
        
        // Check if neighbor is connected to all in component
        const connectedToAll = component.every(c => 
          c === neighbor || neighborConnections.has(c)
        );
        
        if (connectedToAll) {
          component.push(neighbor);
        }
      }

      if (component.length >= 3) {
        components.push(component);
        component.forEach(c => processed.add(c));
      }
    }

    return components;
  }

  private areConnected(
    node1: string,
    node2: string,
    edges: GraphEdge[]
  ): boolean {
    return edges.some(e => 
      (e.source === node1 && e.target === node2) ||
      (e.source === node2 && e.target === node1)
    );
  }

  private calculateIndustrySynergy(
    industries1: string[],
    industries2: string[]
  ): number {
    if (!industries1.length || !industries2.length) return 0;

    const synergies: Record<string, string[]> = {
      'Technology': ['Manufacturing', 'Retail', 'Healthcare'],
      'Manufacturing': ['Logistics', 'Wholesale', 'Technology'],
      'Retail': ['Wholesale', 'E-commerce', 'Marketing'],
      'Construction': ['Real Estate', 'Architecture', 'Engineering'],
      'Healthcare': ['Pharmaceuticals', 'Technology', 'Insurance']
    };

    let maxSynergy = 0;

    for (const ind1 of industries1) {
      for (const ind2 of industries2) {
        if (synergies[ind1]?.includes(ind2) || synergies[ind2]?.includes(ind1)) {
          maxSynergy = Math.max(maxSynergy, 0.8);
        } else if (ind1 === ind2) {
          maxSynergy = Math.max(maxSynergy, 0.4); // Same industry
        }
      }
    }

    return maxSynergy;
  }

  private analyzeSupplyChain(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): RelationshipInsight[] {
    const insights: RelationshipInsight[] = [];

    // Find supply chain paths
    const supplyEdges = edges.filter(e => 
      e.type === RelationshipType.SUPPLIER ||
      e.type === RelationshipType.CUSTOMER
    );

    // Identify supply chain bottlenecks
    const nodeDependencies = new Map<string, number>();
    
    for (const edge of supplyEdges) {
      nodeDependencies.set(
        edge.target,
        (nodeDependencies.get(edge.target) || 0) + 1
      );
    }

    // Find critical suppliers
    for (const [nodeId, depCount] of nodeDependencies) {
      if (depCount >= 3) {
        const node = nodes.get(nodeId);
        if (node) {
          insights.push({
            type: 'risk',
            title: 'Critical Supplier',
            description: `${node.businessName} is a critical supplier to ${depCount} businesses`,
            score: Math.min(depCount / 5, 1.0),
            affectedNodes: [nodeId],
            recommendations: [
              'Diversify supplier base',
              'Establish backup suppliers',
              'Consider strategic partnership'
            ]
          });
        }
      }
    }

    return insights;
  }

  private analyzeCommunities(
    communities: CommunityCluster[],
    nodes: Map<string, GraphNode>
  ): RelationshipInsight[] {
    const insights: RelationshipInsight[] = [];

    for (const community of communities) {
      if (community.cohesion > 0.7) {
        const centralNode = nodes.get(community.centralNode);
        if (centralNode) {
          insights.push({
            type: 'cluster',
            title: 'Tight Business Cluster',
            description: `${centralNode.businessName} is central to a tightly connected cluster`,
            score: community.cohesion,
            affectedNodes: community.members,
            recommendations: [
              'Leverage cluster for joint initiatives',
              'Explore cluster-wide partnerships',
              'Consider cluster marketing strategies'
            ]
          });
        }
      }
    }

    return insights;
  }

  private identifyRisks(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    analysis: NetworkAnalysis
  ): RelationshipInsight[] {
    const risks: RelationshipInsight[] = [];

    // Single points of failure
    for (const bridgeNode of analysis.bridgeNodes) {
      const node = nodes.get(bridgeNode);
      if (node) {
        risks.push({
          type: 'risk',
          title: 'Network Bridge Risk',
          description: `${node.businessName} is a critical bridge in the network`,
          score: 0.8,
          affectedNodes: [bridgeNode],
          recommendations: [
            'Create redundant connections',
            'Strengthen relationships',
            'Monitor business health'
          ]
        });
      }
    }

    return risks;
  }

  private async generateAIInsights(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): Promise<RelationshipInsight[]> {
    try {
      const graphSummary = {
        nodeCount: nodes.size,
        edgeCount: edges.length,
        businessTypes: this.summarizeBusinessTypes(nodes),
        industries: this.summarizeIndustries(nodes),
        relationshipTypes: this.summarizeRelationships(edges)
      };

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a business strategy analyst specializing in network analysis.'
          },
          {
            role: 'user',
            content: `Analyze this business network and provide strategic insights:
              ${JSON.stringify(graphSummary)}
              
              Provide 3 specific, actionable insights about opportunities or risks.`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const aiInsights = JSON.parse(response.choices[0].message.content || '{}');
      
      return (aiInsights.insights || []).map((insight: any) => ({
        type: 'opportunity' as const,
        title: insight.title,
        description: insight.description,
        score: insight.confidence || 0.7,
        affectedNodes: [],
        recommendations: insight.recommendations || []
      }));

    } catch (error) {
      this.logger.error('AI insight generation failed:', error);
      return [];
    }
  }

  private summarizeBusinessTypes(nodes: Map<string, GraphNode>): Record<string, number> {
    const types: Record<string, number> = {};
    for (const node of nodes.values()) {
      types[node.businessType] = (types[node.businessType] || 0) + 1;
    }
    return types;
  }

  private summarizeIndustries(nodes: Map<string, GraphNode>): Record<string, number> {
    const industries: Record<string, number> = {};
    for (const node of nodes.values()) {
      for (const industry of node.industry) {
        industries[industry] = (industries[industry] || 0) + 1;
      }
    }
    return industries;
  }

  private summarizeRelationships(edges: GraphEdge[]): Record<string, number> {
    const types: Record<string, number> = {};
    for (const edge of edges) {
      types[edge.type] = (types[edge.type] || 0) + 1;
    }
    return types;
  }

  private calculateNetworkMetrics(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[]
  ): NetworkMetrics {
    const nodeCount = nodes.size;
    const edgeCount = edges.length;
    const possibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = possibleEdges > 0 ? edgeCount / possibleEdges : 0;

    // Calculate average degree
    const degrees = new Map<string, number>();
    for (const edge of edges) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
    
    const avgDegree = degrees.size > 0
      ? Array.from(degrees.values()).reduce((a, b) => a + b, 0) / degrees.size
      : 0;

    // Find diameter (simplified)
    const diameter = Math.ceil(Math.log2(nodeCount));

    return {
      nodeCount,
      edgeCount,
      density,
      avgDegree,
      diameter,
      clustering: 0, // Would need more complex calculation
      centralization: 0 // Would need more complex calculation
    };
  }

  private identifyKeyPlayers(
    nodes: Map<string, GraphNode>,
    analysis: NetworkAnalysis
  ): GraphNode[] {
    const keyPlayers: GraphNode[] = [];

    // Get top nodes by centrality
    const sortedByCentrality = Array.from(analysis.centralityScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [nodeId] of sortedByCentrality) {
      const node = nodes.get(nodeId);
      if (node) {
        keyPlayers.push(node);
      }
    }

    return keyPlayers;
  }

  private async findEcosystemOpportunities(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    analysis: NetworkAnalysis
  ): Promise<RelationshipInsight[]> {
    const opportunities: RelationshipInsight[] = [];

    // Cross-community opportunities
    if (analysis.communities.length >= 2) {
      for (let i = 0; i < analysis.communities.length; i++) {
        for (let j = i + 1; j < analysis.communities.length; j++) {
          const community1 = analysis.communities[i];
          const community2 = analysis.communities[j];

          // Check for potential bridges
          const connections = edges.filter(e => 
            community1.members.includes(e.source) && 
            community2.members.includes(e.target) ||
            community2.members.includes(e.source) && 
            community1.members.includes(e.target)
          );

          if (connections.length < 2) {
            opportunities.push({
              type: 'opportunity',
              title: 'Community Bridge Opportunity',
              description: `Connect ${community1.characteristics.dominantIndustries[0]} and ${community2.characteristics.dominantIndustries[0]} clusters`,
              score: 0.8,
              affectedNodes: [
                ...community1.members.slice(0, 2),
                ...community2.members.slice(0, 2)
              ],
              recommendations: [
                'Facilitate cross-cluster introductions',
                'Organize joint events',
                'Explore collaborative projects'
              ]
            });
          }
        }
      }
    }

    return opportunities;
  }

  private countIndirectConnections(
    nodeId: string,
    graph: RelationshipGraph,
    depth: number
  ): number {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    visited.add(nodeId);

    let count = 0;

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift()!;
      
      if (currentDepth > 0 && currentDepth <= depth) {
        count++;
      }

      if (currentDepth < depth) {
        const neighbors = graph.edges
          .filter(e => e.source === id || e.target === id)
          .map(e => e.source === id ? e.target : e.source)
          .filter(n => !visited.has(n));

        for (const neighbor of neighbors) {
          visited.add(neighbor);
          queue.push({ id: neighbor, depth: currentDepth + 1 });
        }
      }
    }

    return count;
  }

  private async calculateCentrality(
    nodeId: string,
    graph: RelationshipGraph
  ): Promise<number> {
    // Degree centrality normalized
    const degree = graph.edges.filter(
      e => e.source === nodeId || e.target === nodeId
    ).length;

    return degree / (graph.nodes.length - 1);
  }

  private calculateBridgeScore(
    nodeId: string,
    graph: RelationshipGraph
  ): number {
    // Simplified bridge score
    const neighbors = graph.edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);

    if (neighbors.length < 2) return 0;

    let nonConnectedPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        totalPairs++;
        const connected = graph.edges.some(e =>
          (e.source === neighbors[i] && e.target === neighbors[j]) ||
          (e.source === neighbors[j] && e.target === neighbors[i])
        );
        if (!connected) nonConnectedPairs++;
      }
    }

    return totalPairs > 0 ? nonConnectedPairs / totalPairs : 0;
  }

  private calculateCommunityInfluence(
    nodeId: string,
    graph: RelationshipGraph
  ): number {
    // Find community
    const community = graph.communities?.find(c => c.members.includes(nodeId));
    if (!community) return 0;

    // Influence based on position in community
    if (community.centralNode === nodeId) return 1.0;
    
    return 0.5; // Simplified
  }

  private async getInfluenceRank(
    businessId: string,
    score: number
  ): Promise<number> {
    // This would compare against all businesses
    return 1; // Placeholder
  }

  private getTopConnections(
    businessId: string,
    graph: RelationshipGraph,
    limit: number
  ): GraphNode[] {
    const connections = graph.edges
      .filter(e => e.source === businessId || e.target === businessId)
      .map(e => {
        const connectedId = e.source === businessId ? e.target : e.source;
        const node = graph.nodes.find(n => n.id === connectedId);
        return { node, weight: e.weight };
      })
      .filter(c => c.node)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map(c => c.node!);

    return connections;
  }

  private async findPathsNeo4j(
    sourceId: string,
    targetId: string,
    maxPaths: number
  ): Promise<PathAnalysis> {
    // Neo4j implementation would go here
    return this.findPathsInMemory(sourceId, targetId, maxPaths);
  }

  private async findPathsInMemory(
    sourceId: string,
    targetId: string,
    maxPaths: number
  ): Promise<PathAnalysis> {
    // Build graph from cache or fetch
    const sourceGraph = await this.getOrBuildGraph(sourceId);
    
    // BFS to find shortest path
    const shortestPath = this.bfsShortestPath(sourceId, targetId, sourceGraph);
    
    // Find alternative paths
    const alternativePaths: GraphNode[][] = [];
    
    // Calculate path strength
    const pathStrength = this.calculatePathStrength(shortestPath, sourceGraph);
    
    // Find intermediaries
    const intermediaries = shortestPath.slice(1, -1);

    return {
      shortestPath,
      alternativePaths,
      pathStrength,
      intermediaries
    };
  }

  private bfsShortestPath(
    sourceId: string,
    targetId: string,
    graph: RelationshipGraph
  ): GraphNode[] {
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: sourceId, path: [sourceId] }
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (nodeId === targetId) {
        return path.map(id => graph.nodes.find(n => n.id === id)!);
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const neighbors = graph.edges
        .filter(e => e.source === nodeId || e.target === nodeId)
        .map(e => e.source === nodeId ? e.target : e.source);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ nodeId: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return [];
  }

  private calculatePathStrength(
    path: GraphNode[],
    graph: RelationshipGraph
  ): number {
    if (path.length < 2) return 0;

    let totalWeight = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = graph.edges.find(e =>
        (e.source === path[i].id && e.target === path[i + 1].id) ||
        (e.source === path[i + 1].id && e.target === path[i].id)
      );
      if (edge) {
        totalWeight += edge.weight;
      }
    }

    return totalWeight / (path.length - 1);
  }

  private async getCachedGraph(businessId: string): Promise<RelationshipGraph | null> {
    // Check memory cache
    if (this.graphCache.has(businessId)) {
      return this.graphCache.get(businessId)!;
    }

    // Check Redis
    const cached = await this.redis.get(`graph:${businessId}`);
    if (cached) {
      const graph = JSON.parse(cached);
      this.graphCache.set(businessId, graph);
      return graph;
    }

    return null;
  }

  private async cacheGraph(businessId: string, graph: RelationshipGraph): Promise<void> {
    // Memory cache
    this.graphCache.set(businessId, graph);

    // Redis cache
    await this.redis.setex(
      `graph:${businessId}`,
      3600 * 24, // 24 hours
      JSON.stringify(graph)
    );
  }

  private async getOrBuildGraph(businessId: string): Promise<RelationshipGraph> {
    const cached = await this.getCachedGraph(businessId);
    if (cached) return cached;

    const business = await this.getBusinessData(businessId);
    if (!business) {
      throw new Error(`Business ${businessId} not found`);
    }

    return await this.buildBusinessGraph(business);
  }

  private async getBusinessData(businessId: string): Promise<EnrichedBusiness | null> {
    const data = await this.redis.get(`business:${businessId}`);
    return data ? JSON.parse(data) : null;
  }

  private async storeInNeo4j(graph: RelationshipGraph): Promise<void> {
    if (!this.neo4jDriver) return;

    const session = this.neo4jDriver.session();
    
    try {
      // Store nodes
      for (const node of graph.nodes) {
        await session.run(
          `MERGE (b:Business {id: $id})
           SET b.name = $name, b.type = $type, b.industry = $industry`,
          {
            id: node.id,
            name: node.businessName,
            type: node.businessType,
            industry: node.industry
          }
        );
      }

      // Store edges
      for (const edge of graph.edges) {
        await session.run(
          `MATCH (a:Business {id: $source})
           MATCH (b:Business {id: $target})
           MERGE (a)-[r:${edge.type}]->(b)
           SET r.weight = $weight`,
          {
            source: edge.source,
            target: edge.target,
            weight: edge.weight
          }
        );
      }

    } finally {
      await session.close();
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.graphCache.clear();
    
    if (this.neo4jDriver) {
      await this.neo4jDriver.close();
    }
  }
}