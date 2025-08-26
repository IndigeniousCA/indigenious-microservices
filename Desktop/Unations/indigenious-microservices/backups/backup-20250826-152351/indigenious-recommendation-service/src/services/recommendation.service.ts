import { PrismaClient, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { format, getMonth, startOfYear } from 'date-fns';
import axios from 'axios';
import Redis from 'ioredis';
import * as tf from '@tensorflow/tfjs-node';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class RecommendationService {
  // Weights for different recommendation factors
  private static readonly AI_WEIGHT = 0.4;
  private static readonly ELDER_WEIGHT = 0.3;
  private static readonly COMMUNITY_WEIGHT = 0.2;
  private static readonly CULTURAL_WEIGHT = 0.1;
  
  // Medicine Wheel seasons mapping
  private static readonly MEDICINE_SEASONS = {
    EAST: 'SPRING',
    SOUTH: 'SUMMER', 
    WEST: 'FALL',
    NORTH: 'WINTER'
  };
  
  // Generate personalized recommendations
  static async generateRecommendations(userId: string, context?: any) {
    // Get user profile
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      await this.createUserProfile(userId);
    }
    
    // Get multiple recommendation sources
    const [
      aiRecommendations,
      elderRecommendations,
      communityRecommendations,
      seasonalRecommendations
    ] = await Promise.all([
      this.getAIRecommendations(userId, profile),
      this.getElderRecommendations(userId, profile),
      this.getCommunityRecommendations(userId, profile),
      this.getSeasonalRecommendations(userId, profile)
    ]);
    
    // Combine and rank recommendations
    const combinedRecommendations = await this.combineRecommendations({
      ai: aiRecommendations,
      elder: elderRecommendations,
      community: communityRecommendations,
      seasonal: seasonalRecommendations
    }, profile);
    
    // Apply Medicine Wheel balance if Indigenous user
    let finalRecommendations = combinedRecommendations;
    if (profile?.indigenousUser) {
      finalRecommendations = await this.applyMedicineWheelBalance(
        combinedRecommendations,
        profile
      );
    }
    
    // Store recommendations
    for (const rec of finalRecommendations) {
      await this.storeRecommendation(rec);
    }
    
    // Cache for quick access
    await redis.set(
      `recommendations:${userId}`,
      JSON.stringify(finalRecommendations),
      'EX',
      3600 // 1 hour cache
    );
    
    return finalRecommendations;
  }
  
  // Get AI-based recommendations
  private static async getAIRecommendations(userId: string, profile: any) {
    const recommendations: any[] = [];
    
    // Collaborative filtering
    const similarUsers = await this.findSimilarUsers(userId);
    const collaborativeRecs = await this.getCollaborativeRecommendations(
      userId,
      similarUsers
    );
    
    // Content-based filtering
    const contentRecs = await this.getContentBasedRecommendations(userId, profile);
    
    // Deep learning predictions
    const dlRecs = await this.getDeepLearningRecommendations(userId, profile);
    
    // Combine AI methods
    const aiProducts = [...collaborativeRecs, ...contentRecs, ...dlRecs];
    
    for (const product of aiProducts.slice(0, 10)) {
      recommendations.push({
        recommendationId: uuidv4(),
        userId,
        type: 'PRODUCT',
        productId: product.productId,
        score: product.score,
        aiScore: product.score,
        reason: 'AI recommendation based on your preferences',
        explanation: {
          collaborative: product.collaborativeScore,
          contentBased: product.contentScore,
          deepLearning: product.dlScore
        }
      });
    }
    
    return recommendations;
  }
  
  // Get Elder wisdom recommendations
  private static async getElderRecommendations(userId: string, profile: any) {
    const recommendations: any[] = [];
    
    // Get applicable wisdom rules
    const wisdomRules = await prisma.wisdomRule.findMany({
      where: {
        active: true,
        validated: true
      }
    });
    
    // Apply Elder wisdom rules
    for (const rule of wisdomRules) {
      if (await this.evaluateWisdomRule(rule, profile)) {
        const elderRec = await this.createElderRecommendation(
          userId,
          rule,
          profile
        );
        
        if (elderRec) {
          recommendations.push({
            recommendationId: uuidv4(),
            userId,
            type: elderRec.type,
            productId: elderRec.productId,
            vendorId: elderRec.vendorId,
            score: 0.9, // Elder recommendations have high weight
            elderScore: 0.9,
            reason: `Elder wisdom: ${elderRec.wisdom}`,
            elderApproved: true,
            culturallyRelevant: true,
            explanation: {
              elder: rule.elderName,
              teaching: elderRec.wisdom,
              culturalContext: rule.culturalContext
            }
          });
        }
      }
    }
    
    // Get ceremony-based recommendations
    if (profile?.ceremonyParticipant) {
      const ceremonyRecs = await this.getCeremonyRecommendations(userId, profile);
      recommendations.push(...ceremonyRecs);
    }
    
    return recommendations;
  }
  
  // Get community-based recommendations
  private static async getCommunityRecommendations(userId: string, profile: any) {
    const recommendations: any[] = [];
    
    // Get community trending products
    const communityTrending = await this.getCommunityTrending(profile);
    
    // Get products supporting local community
    const localProducts = await this.getLocalCommunityProducts(profile);
    
    // Combine community recommendations
    const communityProducts = [...communityTrending, ...localProducts];
    
    for (const product of communityProducts.slice(0, 5)) {
      recommendations.push({
        recommendationId: uuidv4(),
        userId,
        type: 'PRODUCT',
        productId: product.productId,
        score: product.score,
        communityScore: product.score,
        reason: `Popular in your community: ${product.reason}`,
        indigenousVendor: product.indigenousVendor,
        communityBenefit: product.communityBenefit,
        localImpact: product.localImpact
      });
    }
    
    return recommendations;
  }
  
  // Get seasonal recommendations
  private static async getSeasonalRecommendations(userId: string, profile: any) {
    const recommendations: any[] = [];
    const currentSeason = this.getCurrentSeason();
    const currentMoonPhase = await this.getCurrentMoonPhase();
    
    // Get seasonal patterns
    const patterns = await prisma.seasonalPattern.findMany({
      where: {
        userId,
        season: currentSeason
      },
      orderBy: { year: 'desc' },
      take: 3
    });
    
    // Get seasonal products
    const seasonalProducts = await this.getSeasonalProducts(
      currentSeason,
      profile
    );
    
    // Check ceremony calendar
    const upcomingCeremonies = await prisma.ceremonyCalendar.findMany({
      where: {
        OR: [
          { season: currentSeason },
          { moonPhase: currentMoonPhase }
        ]
      }
    });
    
    // Create seasonal recommendations
    for (const product of seasonalProducts.slice(0, 5)) {
      const ceremony = upcomingCeremonies.find(c => 
        c.recommendedProducts.includes(product.productId)
      );
      
      recommendations.push({
        recommendationId: uuidv4(),
        userId,
        type: 'SEASONAL',
        productId: product.productId,
        score: product.score,
        culturalScore: product.culturalScore,
        reason: `Seasonal recommendation for ${currentSeason}`,
        seasonalRecommendation: true,
        season: currentSeason,
        moonPhase: currentMoonPhase,
        ceremonyAppropriate: !!ceremony,
        explanation: {
          season: currentSeason,
          moonPhase: currentMoonPhase,
          ceremony: ceremony?.name
        }
      });
    }
    
    return recommendations;
  }
  
  // Create Elder recommendation entry
  static async createElderRecommendation(userId: string, rule: any, profile: any) {
    // Parse rule actions to get recommendation
    const actions = rule.actions as any;
    
    const elderRec = await prisma.elderRecommendation.create({
      data: {
        recommendationId: uuidv4(),
        userId,
        elderId: rule.elderId || 'system',
        elderName: rule.elderName || 'Community Elders',
        elderNation: rule.nation,
        type: actions.type || 'TEACHING',
        productId: actions.productId,
        vendorId: actions.vendorId,
        teaching: actions.teaching,
        wisdom: rule.description,
        story: actions.story,
        culturalImportance: actions.importance || 'HIGH',
        ceremonyRelated: rule.ceremonySpecific,
        traditionalUse: actions.traditionalUse,
        healingProperties: actions.healingProperties,
        spiritualSignificance: actions.spiritualSignificance,
        seasonalGuidance: rule.seasonSpecific ? actions.seasonalGuidance : null,
        medicineWheelTeaching: actions.medicineWheelTeaching,
        direction: actions.direction,
        communityContext: rule.culturalContext,
        generationalWisdom: actions.generationalWisdom,
        youthGuidance: actions.youthGuidance || false,
        publicSharing: true,
        restrictedKnowledge: false
      }
    });
    
    return elderRec;
  }
  
  // Apply Medicine Wheel balance to recommendations
  private static async applyMedicineWheelBalance(recommendations: any[], profile: any) {
    // Get user's medicine wheel alignment
    const userDirection = profile.primaryDirection || 'EAST';
    const currentSeason = this.getCurrentSeason();
    const seasonDirection = this.getDirectionForSeason(currentSeason);
    
    // Balance recommendations across all four directions
    const balanced = recommendations.map(rec => {
      let balanceScore = rec.score;
      
      // Boost if aligns with user's primary direction
      if (rec.direction === userDirection) {
        balanceScore *= 1.2;
      }
      
      // Boost if aligns with current season
      if (rec.direction === seasonDirection) {
        balanceScore *= 1.1;
      }
      
      // Ensure medicine wheel balance
      rec.medicineWheelAligned = true;
      rec.direction = rec.direction || seasonDirection;
      rec.score = Math.min(balanceScore, 1.0);
      
      return rec;
    });
    
    // Sort by balanced score
    return balanced.sort((a, b) => b.score - a.score);
  }
  
  // Combine recommendations from different sources
  private static async combineRecommendations(sources: any, profile: any) {
    const combined: Map<string, any> = new Map();
    
    // Weight and combine AI recommendations
    for (const rec of sources.ai) {
      const key = `${rec.type}-${rec.productId || rec.vendorId}`;
      combined.set(key, {
        ...rec,
        score: rec.score * this.AI_WEIGHT
      });
    }
    
    // Add Elder recommendations with higher weight
    for (const rec of sources.elder) {
      const key = `${rec.type}-${rec.productId || rec.vendorId}`;
      const existing = combined.get(key);
      
      if (existing) {
        existing.score += rec.score * this.ELDER_WEIGHT;
        existing.elderScore = rec.elderScore;
        existing.elderApproved = true;
      } else {
        combined.set(key, {
          ...rec,
          score: rec.score * this.ELDER_WEIGHT
        });
      }
    }
    
    // Add community recommendations
    for (const rec of sources.community) {
      const key = `${rec.type}-${rec.productId || rec.vendorId}`;
      const existing = combined.get(key);
      
      if (existing) {
        existing.score += rec.score * this.COMMUNITY_WEIGHT;
        existing.communityScore = rec.communityScore;
      } else {
        combined.set(key, {
          ...rec,
          score: rec.score * this.COMMUNITY_WEIGHT
        });
      }
    }
    
    // Add seasonal/cultural recommendations
    for (const rec of sources.seasonal) {
      const key = `${rec.type}-${rec.productId || rec.vendorId}`;
      const existing = combined.get(key);
      
      if (existing) {
        existing.score += rec.score * this.CULTURAL_WEIGHT;
        existing.culturalScore = rec.culturalScore;
        existing.seasonalRecommendation = true;
      } else {
        combined.set(key, {
          ...rec,
          score: rec.score * this.CULTURAL_WEIGHT
        });
      }
    }
    
    // Apply seven generations thinking
    if (profile?.sevenGenScore && profile.sevenGenScore > 7) {
      for (const [key, rec] of combined) {
        if (rec.sustainabilityScore && rec.sustainabilityScore > 70) {
          rec.score *= 1.15; // Boost sustainable products
          rec.futureImpact = 'Positive impact for future generations';
        }
      }
    }
    
    // Convert to array and sort by score
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Top 20 recommendations
  }
  
  // Track user interaction with recommendation
  static async trackInteraction(recommendationId: string, interaction: any) {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    });
    
    if (!recommendation) return;
    
    // Update recommendation tracking
    const updates: any = {};
    
    switch (interaction.type) {
      case 'VIEW':
        updates.displayed = true;
        updates.displayedAt = new Date();
        break;
      case 'CLICK':
        updates.clicked = true;
        updates.clickedAt = new Date();
        break;
      case 'PURCHASE':
        updates.converted = true;
        updates.convertedAt = new Date();
        break;
    }
    
    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: updates
    });
    
    // Store interaction for learning
    await prisma.userInteraction.create({
      data: {
        userId: recommendation.userId,
        type: interaction.type,
        targetId: recommendationId,
        targetType: 'RECOMMENDATION',
        action: interaction.action || interaction.type,
        context: interaction.context
      }
    });
    
    // Update model performance metrics
    await this.updateModelMetrics(recommendation, interaction);
  }
  
  // Provide feedback on recommendation
  static async provideFeedback(recommendationId: string, feedback: any) {
    await prisma.recommendationFeedback.create({
      data: {
        recommendationId,
        helpful: feedback.helpful,
        relevant: feedback.relevant,
        culturallyAppropriate: feedback.culturallyAppropriate,
        reason: feedback.reason,
        elderValidated: feedback.elderValidated || false,
        elderFeedback: feedback.elderFeedback
      }
    });
    
    // Update recommendation status based on feedback
    if (!feedback.helpful || !feedback.relevant) {
      await prisma.recommendation.update({
        where: { id: recommendationId },
        data: { status: 'REJECTED' }
      });
    }
    
    // Retrain model if needed
    await this.checkRetrainingNeeded();
  }
  
  // Helper functions
  private static async getUserProfile(userId: string) {
    return await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        browsingHistory: {
          orderBy: { timestamp: 'desc' },
          take: 100
        },
        purchaseHistory: {
          orderBy: { purchaseDate: 'desc' },
          take: 50
        },
        seasonalPatterns: true
      }
    });
  }
  
  private static async createUserProfile(userId: string) {
    return await prisma.userProfile.create({
      data: {
        userId,
        preferences: {},
        interests: [],
        indigenousUser: false,
        culturalInterests: [],
        communityOriented: false,
        localFirst: false,
        supportIndigenous: true,
        primaryLanguage: 'en',
        indigenousLanguages: []
      }
    });
  }
  
  private static async findSimilarUsers(userId: string) {
    const similarities = await prisma.collaborativeFilter.findMany({
      where: {
        OR: [
          { userId1: userId },
          { userId2: userId }
        ],
        similarity: { gte: 0.7 }
      },
      orderBy: { similarity: 'desc' },
      take: 20
    });
    
    return similarities.map(s => 
      s.userId1 === userId ? s.userId2 : s.userId1
    );
  }
  
  private static async getCollaborativeRecommendations(userId: string, similarUsers: string[]) {
    // Get products purchased by similar users
    const purchases = await prisma.purchaseHistory.findMany({
      where: {
        userId: { in: similarUsers }
      },
      select: {
        productId: true,
        rating: true
      }
    });
    
    // Score products by frequency and rating
    const productScores = new Map<string, number>();
    for (const purchase of purchases) {
      const current = productScores.get(purchase.productId) || 0;
      const score = purchase.rating ? purchase.rating / 5 : 0.6;
      productScores.set(purchase.productId, current + score);
    }
    
    // Normalize and return top products
    const maxScore = Math.max(...productScores.values());
    return Array.from(productScores.entries())
      .map(([productId, score]) => ({
        productId,
        score: score / maxScore,
        collaborativeScore: score / maxScore
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
  
  private static async getContentBasedRecommendations(userId: string, profile: any) {
    // Get user's interest vector
    const userVector = await this.getUserInterestVector(profile);
    
    // Get product embeddings
    const products = await prisma.productEmbedding.findMany({
      take: 100
    });
    
    // Calculate similarity scores
    const recommendations = products.map(product => {
      const similarity = this.cosineSimilarity(
        userVector,
        product.embedding as any
      );
      
      return {
        productId: product.productId,
        score: similarity,
        contentScore: similarity
      };
    });
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
  
  private static async getDeepLearningRecommendations(userId: string, profile: any) {
    // Placeholder for deep learning model
    // In production, this would call a trained TensorFlow model
    return [];
  }
  
  private static async evaluateWisdomRule(rule: any, profile: any): Promise<boolean> {
    const conditions = rule.conditions as any;
    
    // Check if conditions match user profile
    if (conditions.requiresIndigenous && !profile?.indigenousUser) {
      return false;
    }
    
    if (conditions.season && conditions.season !== this.getCurrentSeason()) {
      return false;
    }
    
    if (conditions.ceremonyParticipant && !profile?.ceremonyParticipant) {
      return false;
    }
    
    return true;
  }
  
  private static async getCeremonyRecommendations(userId: string, profile: any) {
    const upcomingCeremonies = await prisma.ceremonyCalendar.findMany({
      where: {
        date: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
        }
      }
    });
    
    const recommendations: any[] = [];
    
    for (const ceremony of upcomingCeremonies) {
      for (const productId of ceremony.recommendedProducts) {
        recommendations.push({
          recommendationId: uuidv4(),
          userId,
          type: 'CEREMONY',
          productId,
          score: 0.85,
          elderScore: 0.85,
          reason: `Recommended for ${ceremony.name}`,
          ceremonyAppropriate: true,
          elderApproved: true
        });
      }
    }
    
    return recommendations;
  }
  
  private static async getCommunityTrending(profile: any) {
    // Get trending products in user's community
    // Placeholder implementation
    return [];
  }
  
  private static async getLocalCommunityProducts(profile: any) {
    // Get products from local Indigenous vendors
    // Placeholder implementation
    return [];
  }
  
  private static getCurrentSeason(): string {
    const month = getMonth(new Date());
    if (month >= 2 && month <= 4) return 'SPRING';
    if (month >= 5 && month <= 7) return 'SUMMER';
    if (month >= 8 && month <= 10) return 'FALL';
    return 'WINTER';
  }
  
  private static getDirectionForSeason(season: string): string {
    const directions: Record<string, string> = {
      SPRING: 'EAST',
      SUMMER: 'SOUTH',
      FALL: 'WEST',
      WINTER: 'NORTH'
    };
    return directions[season] || 'EAST';
  }
  
  private static async getCurrentMoonPhase(): Promise<string> {
    // Calculate current moon phase
    // Simplified calculation
    const moonCycle = 29.53;
    const knownNewMoon = new Date('2024-01-11');
    const daysSince = (Date.now() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const phase = (daysSince % moonCycle) / moonCycle;
    
    if (phase < 0.125) return 'New Moon';
    if (phase < 0.25) return 'Waxing Crescent';
    if (phase < 0.375) return 'First Quarter';
    if (phase < 0.5) return 'Waxing Gibbous';
    if (phase < 0.625) return 'Full Moon';
    if (phase < 0.75) return 'Waning Gibbous';
    if (phase < 0.875) return 'Last Quarter';
    return 'Waning Crescent';
  }
  
  private static async getSeasonalProducts(season: string, profile: any) {
    // Get products appropriate for current season
    // Placeholder implementation
    return [];
  }
  
  private static async storeRecommendation(rec: any) {
    await prisma.recommendation.create({
      data: {
        ...rec,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });
  }
  
  private static async getUserInterestVector(profile: any): Promise<number[]> {
    // Create user interest vector from browsing and purchase history
    // Placeholder - would use actual embeddings
    return Array(128).fill(0).map(() => Math.random());
  }
  
  private static cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
  
  private static async updateModelMetrics(recommendation: any, interaction: any) {
    // Update model performance based on user interactions
    console.log('Updating model metrics');
  }
  
  private static async checkRetrainingNeeded() {
    // Check if model needs retraining based on feedback
    console.log('Checking if retraining needed');
  }
}