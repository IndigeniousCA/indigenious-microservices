import { prisma } from '../config/database';
import { clickhouse } from '../config/clickhouse';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import {
  RFQAnalytics,
  CategoryBreakdown,
  BusinessAnalytics,
  PerformanceMetrics,
  CompetitivePosition,
  BusinessPredictions,
  TrendData,
} from '../types/analytics.types';
import { MLService } from './ml.service';
import dayjs from 'dayjs';
import * as ss from 'simple-statistics';

export class RFQAnalyticsService {
  private static readonly CACHE_TTL = 1800; // 30 minutes

  /**
   * Analyze RFQ performance and trends
   */
  static async analyzeRFQ(rfqId: string): Promise<RFQAnalytics> {
    try {
      const cacheKey = `rfq-analytics:${rfqId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get RFQ data with responses
      const rfq = await prisma.rfq.findUnique({
        where: { id: rfqId },
        include: {
          responses: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  isIndigenous: true,
                  certifications: true,
                },
              },
            },
          },
          category: true,
          winner: true,
        },
      });

      if (!rfq) {
        throw new Error('RFQ not found');
      }

      // Calculate response metrics
      const responseCount = rfq.responses.length;
      const indigenousResponseCount = rfq.responses.filter(
        r => r.business.isIndigenous
      ).length;

      // Calculate average response time
      const responseTimes = rfq.responses
        .filter(r => r.submittedAt)
        .map(r => dayjs(r.submittedAt).diff(dayjs(rfq.createdAt), 'hours'));
      
      const averageResponseTime = responseTimes.length > 0 
        ? ss.mean(responseTimes) 
        : 0;

      // Determine competition level
      const competitionLevel = this.determineCompetitionLevel(responseCount);

      // Get category breakdown
      const categoryBreakdown = await this.getCategoryBreakdown(rfq.responses);

      // Check if Indigenous business won
      const isIndigenousWinner = rfq.winner?.isIndigenous || false;

      const analytics: RFQAnalytics = {
        rfqId,
        title: rfq.title,
        status: rfq.status,
        createdAt: rfq.createdAt,
        responseCount,
        indigenousResponseCount,
        averageResponseTime,
        estimatedValue: rfq.estimatedBudget || 0,
        actualValue: rfq.finalValue,
        winnerBusinessId: rfq.winnerId,
        isIndigenousWinner,
        competitionLevel,
        categoryBreakdown,
      };

      // Cache the results
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analytics));

      // Store in ClickHouse for historical analysis
      await this.storeRFQAnalytics(analytics);

      return analytics;
    } catch (error) {
      logger.error('Failed to analyze RFQ', error);
      throw error;
    }
  }

  /**
   * Get comprehensive business analytics
   */
  static async getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
    try {
      const cacheKey = `business-analytics:${businessId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get business data
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          rfqsParticipated: {
            include: {
              rfq: true,
              evaluations: true,
            },
          },
          rfqsWon: true,
          certifications: true,
          reviews: true,
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      // Calculate basic metrics
      const totalRFQsParticipated = business.rfqsParticipated.length;
      const totalRFQsWon = business.rfqsWon.length;
      const winRate = totalRFQsParticipated > 0 
        ? (totalRFQsWon / totalRFQsParticipated) * 100 
        : 0;

      // Calculate revenue and contract metrics
      const totalRevenue = business.rfqsWon.reduce(
        (sum, rfq) => sum + (rfq.finalValue || rfq.estimatedBudget || 0),
        0
      );
      const averageContractValue = totalRFQsWon > 0 ? totalRevenue / totalRFQsWon : 0;

      // Calculate response times
      const responseTimes = business.rfqsParticipated
        .filter(r => r.submittedAt)
        .map(r => dayjs(r.submittedAt).diff(dayjs(r.rfq.createdAt), 'hours'));
      
      const averageResponseTime = responseTimes.length > 0 
        ? ss.mean(responseTimes) 
        : 0;

      // Calculate customer satisfaction
      const customerSatisfaction = business.reviews.length > 0
        ? ss.mean(business.reviews.map(r => r.rating))
        : 0;

      // Calculate growth rate
      const growthRate = await this.calculateGrowthRate(businessId);

      // Get performance metrics
      const performance = await this.getPerformanceMetrics(businessId);

      // Get competitive position
      const competitivePosition = await this.getCompetitivePosition(businessId);

      // Get predictions
      const predictions = await this.getBusinessPredictions(businessId);

      const analytics: BusinessAnalytics = {
        businessId,
        businessName: business.name,
        isIndigenous: business.isIndigenous,
        metrics: {
          totalRFQsParticipated,
          totalRFQsWon,
          winRate,
          averageResponseTime,
          totalRevenue,
          averageContractValue,
          customerSatisfaction,
          growthRate,
        },
        performance,
        competitivePosition,
        predictions,
      };

      // Cache the results
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analytics));

      return analytics;
    } catch (error) {
      logger.error('Failed to get business analytics', error);
      throw error;
    }
  }

  /**
   * Track RFQ performance metrics in real-time
   */
  static async trackRFQMetrics(rfqId: string, event: string, data: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Store in ClickHouse for real-time analytics
      const query = `
        INSERT INTO rfq_events
        (rfq_id, event_type, event_data, timestamp, business_id, is_indigenous)
        VALUES
        ('${rfqId}', '${event}', '${JSON.stringify(data)}', '${timestamp}', 
         '${data.businessId || ''}', ${data.isIndigenous || false})
      `;

      await clickhouse.query(query).toPromise();

      // Update Redis counters
      const key = `rfq-metrics:${rfqId}`;
      await redis.hincrby(key, event, 1);
      await redis.expire(key, 86400); // 24 hours

      // Trigger real-time dashboard updates
      await this.broadcastRFQUpdate(rfqId, event, data);

      logger.info('RFQ metrics tracked', { rfqId, event, data });
    } catch (error) {
      logger.error('Failed to track RFQ metrics', error);
      throw error;
    }
  }

  /**
   * Get RFQ success predictions
   */
  static async predictRFQSuccess(rfqData: any): Promise<{
    successProbability: number;
    indigenousWinProbability: number;
    expectedResponseCount: number;
    recommendedImprovements: string[];
  }> {
    try {
      // Prepare features for ML model
      const features = this.extractRFQFeatures(rfqData);
      
      // Use ML service for predictions
      const [
        successPrediction,
        indigenousPrediction,
        responsePrediction,
      ] = await Promise.all([
        MLService.predict('rfq_success', features),
        MLService.predict('indigenous_win', features),
        MLService.predict('response_count', features),
      ]);

      // Generate recommendations based on predictions
      const recommendations = await this.generateRFQRecommendations(
        rfqData,
        successPrediction.probability
      );

      return {
        successProbability: successPrediction.probability * 100,
        indigenousWinProbability: indigenousPrediction.probability * 100,
        expectedResponseCount: Math.round(responsePrediction.value),
        recommendedImprovements: recommendations,
      };
    } catch (error) {
      logger.error('Failed to predict RFQ success', error);
      throw error;
    }
  }

  /**
   * Analyze market competition for RFQ categories
   */
  static async analyzeMarketCompetition(category: string, region?: string): Promise<{
    competitionLevel: 'low' | 'medium' | 'high';
    averageResponseCount: number;
    indigenousParticipation: number;
    priceVariance: number;
    marketLeaders: any[];
    opportunities: string[];
  }> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_rfqs,
          AVG(response_count) as avg_responses,
          AVG(indigenous_response_count) as avg_indigenous,
          STDDEV(average_bid_price) as price_variance,
          COUNT(DISTINCT winner_business_id) as unique_winners
        FROM rfq_analytics
        WHERE category = '${category}'
        ${region ? `AND region = '${region}'` : ''}
        AND created_at >= now() - INTERVAL 12 MONTH
      `;

      const result = await clickhouse.query(query).toPromise();
      const stats = result[0];

      // Determine competition level
      const competitionLevel = this.determineCompetitionLevel(stats.avg_responses);

      // Get market leaders
      const leadersQuery = `
        SELECT
          business_id,
          business_name,
          COUNT(*) as wins,
          SUM(contract_value) as total_value,
          is_indigenous
        FROM rfq_analytics
        WHERE category = '${category}' AND status = 'COMPLETED'
        ${region ? `AND region = '${region}'` : ''}
        GROUP BY business_id, business_name, is_indigenous
        ORDER BY wins DESC, total_value DESC
        LIMIT 10
      `;

      const leaders = await clickhouse.query(leadersQuery).toPromise();

      // Identify opportunities
      const opportunities = await this.identifyMarketOpportunities(category, stats);

      return {
        competitionLevel,
        averageResponseCount: stats.avg_responses || 0,
        indigenousParticipation: (stats.avg_indigenous / stats.avg_responses) * 100,
        priceVariance: stats.price_variance || 0,
        marketLeaders: leaders,
        opportunities,
      };
    } catch (error) {
      logger.error('Failed to analyze market competition', error);
      throw error;
    }
  }

  /**
   * Generate RFQ performance benchmarks
   */
  static async generateBenchmarks(industry: string): Promise<{
    responseTime: { percentiles: any; benchmark: number };
    winRate: { percentiles: any; benchmark: number };
    contractValue: { percentiles: any; benchmark: number };
    satisfaction: { percentiles: any; benchmark: number };
  }> {
    try {
      const query = `
        SELECT
          response_time_hours,
          win_rate,
          contract_value,
          customer_satisfaction
        FROM business_performance
        WHERE industry = '${industry}'
        AND created_at >= now() - INTERVAL 12 MONTH
        AND contract_value > 0
      `;

      const data = await clickhouse.query(query).toPromise();

      // Calculate percentiles for each metric
      const responseTimes = data.map((d: any) => d.response_time_hours).filter(Boolean);
      const winRates = data.map((d: any) => d.win_rate).filter(Boolean);
      const contractValues = data.map((d: any) => d.contract_value).filter(Boolean);
      const satisfactionRates = data.map((d: any) => d.customer_satisfaction).filter(Boolean);

      return {
        responseTime: {
          percentiles: this.calculatePercentiles(responseTimes),
          benchmark: ss.median(responseTimes),
        },
        winRate: {
          percentiles: this.calculatePercentiles(winRates),
          benchmark: ss.median(winRates),
        },
        contractValue: {
          percentiles: this.calculatePercentiles(contractValues),
          benchmark: ss.median(contractValues),
        },
        satisfaction: {
          percentiles: this.calculatePercentiles(satisfactionRates),
          benchmark: ss.median(satisfactionRates),
        },
      };
    } catch (error) {
      logger.error('Failed to generate benchmarks', error);
      throw error;
    }
  }

  /**
   * Helper: Determine competition level
   */
  private static determineCompetitionLevel(responseCount: number): 'low' | 'medium' | 'high' {
    if (responseCount >= 10) return 'high';
    if (responseCount >= 5) return 'medium';
    return 'low';
  }

  /**
   * Helper: Get category breakdown
   */
  private static async getCategoryBreakdown(responses: any[]): Promise<CategoryBreakdown[]> {
    const categoryMap = new Map<string, any[]>();

    responses.forEach(response => {
      const category = response.business.primaryCategory || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(response);
    });

    const breakdown: CategoryBreakdown[] = [];
    for (const [category, categoryResponses] of categoryMap) {
      const prices = categoryResponses
        .map(r => r.bidAmount)
        .filter(Boolean)
        .map(Number);

      breakdown.push({
        category,
        responseCount: categoryResponses.length,
        averagePrice: prices.length > 0 ? ss.mean(prices) : 0,
        priceRange: {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
        },
      });
    }

    return breakdown;
  }

  /**
   * Helper: Store RFQ analytics in ClickHouse
   */
  private static async storeRFQAnalytics(analytics: RFQAnalytics): Promise<void> {
    const query = `
      INSERT INTO rfq_performance_summary
      (rfq_id, title, status, created_at, response_count, indigenous_response_count,
       avg_response_time, estimated_value, actual_value, winner_business_id,
       is_indigenous_winner, competition_level)
      VALUES
      ('${analytics.rfqId}', '${analytics.title}', '${analytics.status}',
       '${analytics.createdAt.toISOString()}', ${analytics.responseCount},
       ${analytics.indigenousResponseCount}, ${analytics.averageResponseTime},
       ${analytics.estimatedValue}, ${analytics.actualValue || 'NULL'},
       '${analytics.winnerBusinessId || ''}', ${analytics.isIndigenousWinner},
       '${analytics.competitionLevel}')
    `;

    await clickhouse.query(query).toPromise();
  }

  /**
   * Helper: Calculate growth rate
   */
  private static async calculateGrowthRate(businessId: string): Promise<number> {
    const query = `
      SELECT
        toMonth(created_at) as month,
        SUM(contract_value) as monthly_revenue
      FROM business_contracts
      WHERE business_id = '${businessId}'
      AND created_at >= now() - INTERVAL 6 MONTH
      GROUP BY month
      ORDER BY month
    `;

    const data = await clickhouse.query(query).toPromise();
    if (data.length < 2) return 0;

    const revenues = data.map((d: any) => d.monthly_revenue);
    const recentRevenue = revenues.slice(-2)[1];
    const previousRevenue = revenues.slice(-2)[0];

    if (previousRevenue === 0) return 100;
    return ((recentRevenue - previousRevenue) / previousRevenue) * 100;
  }

  /**
   * Helper: Get performance metrics
   */
  private static async getPerformanceMetrics(businessId: string): Promise<PerformanceMetrics> {
    const query = `
      SELECT
        AVG(on_time_delivery) as on_time,
        AVG(quality_score) as quality,
        AVG(communication_score) as communication,
        AVG(overall_rating) as overall
      FROM project_evaluations
      WHERE business_id = '${businessId}'
      AND created_at >= now() - INTERVAL 12 MONTH
    `;

    const result = await clickhouse.query(query).toPromise();
    const metrics = result[0] || {};

    // Calculate trends
    const trends = await this.calculatePerformanceTrends(businessId);

    return {
      onTimeDelivery: metrics.on_time || 0,
      qualityScore: metrics.quality || 0,
      communicationScore: metrics.communication || 0,
      overallRating: metrics.overall || 0,
      trends,
    };
  }

  /**
   * Helper: Get competitive position
   */
  private static async getCompetitivePosition(businessId: string): Promise<CompetitivePosition> {
    // Get business industry and region for comparison
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { industry: true, region: true },
    });

    const query = `
      SELECT
        business_id,
        total_revenue,
        win_rate,
        RANK() OVER (ORDER BY total_revenue DESC) as revenue_rank,
        COUNT(*) OVER () as total_businesses
      FROM business_performance_summary
      WHERE industry = '${business?.industry}'
      AND region = '${business?.region}'
      ORDER BY total_revenue DESC
    `;

    const results = await clickhouse.query(query).toPromise();
    const businessRank = results.find((r: any) => r.business_id === businessId);

    const ranking = businessRank?.revenue_rank || results.length;
    const totalCompetitors = results.length;
    const marketShare = businessRank ? (businessRank.total_revenue / 
      results.reduce((sum: number, r: any) => sum + r.total_revenue, 0)) * 100 : 0;

    return {
      marketShare,
      ranking,
      totalCompetitors,
      strengths: await this.identifyStrengths(businessId),
      opportunities: await this.identifyBusinessOpportunities(businessId),
    };
  }

  /**
   * Helper: Get business predictions
   */
  private static async getBusinessPredictions(businessId: string): Promise<BusinessPredictions> {
    // Use ML models for predictions
    const features = await this.extractBusinessFeatures(businessId);
    
    const [
      revenuePredict,
      growthPredict,
      winProbability,
      churnRisk,
    ] = await Promise.all([
      MLService.predict('revenue_forecast', features),
      MLService.predict('growth_forecast', features),
      MLService.predict('win_probability', features),
      MLService.predict('churn_risk', features),
    ]);

    const expansionOpportunities = await this.identifyExpansionOpportunities(businessId);

    return {
      nextMonthRevenue: revenuePredict.value,
      nextQuarterGrowth: growthPredict.value,
      rfqWinProbability: winProbability.probability * 100,
      churnRisk: this.categorizeChurnRisk(churnRisk.probability),
      expansionOpportunities,
    };
  }

  /**
   * Helper: Extract RFQ features for ML
   */
  private static extractRFQFeatures(rfqData: any): number[] {
    return [
      rfqData.estimatedBudget || 0,
      dayjs(rfqData.deadline).diff(dayjs(), 'days'),
      rfqData.requirements?.length || 0,
      rfqData.isUrgent ? 1 : 0,
      rfqData.categoryComplexity || 1,
      // Add more feature extraction logic
    ];
  }

  /**
   * Helper: Generate RFQ recommendations
   */
  private static async generateRFQRecommendations(
    rfqData: any,
    successProbability: number
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (successProbability < 0.3) {
      recommendations.push('Extend deadline to attract more quality responses');
      recommendations.push('Clarify requirements to reduce uncertainty');
      recommendations.push('Consider increasing budget to competitive levels');
    }

    if (rfqData.estimatedBudget < 10000) {
      recommendations.push('Target smaller Indigenous businesses for better participation');
    }

    // Add more recommendation logic

    return recommendations;
  }

  /**
   * Helper: Broadcast real-time RFQ updates
   */
  private static async broadcastRFQUpdate(rfqId: string, event: string, data: any): Promise<void> {
    // In production, this would use WebSocket or Server-Sent Events
    await redis.publish('rfq_updates', JSON.stringify({
      rfqId,
      event,
      data,
      timestamp: new Date(),
    }));
  }

  /**
   * Helper: Calculate percentiles
   */
  private static calculatePercentiles(data: number[]): any {
    if (data.length === 0) return {};
    
    const sorted = data.sort((a, b) => a - b);
    return {
      p25: ss.quantile(sorted, 0.25),
      p50: ss.quantile(sorted, 0.50),
      p75: ss.quantile(sorted, 0.75),
      p90: ss.quantile(sorted, 0.90),
      p95: ss.quantile(sorted, 0.95),
    };
  }

  /**
   * Helper: Calculate performance trends
   */
  private static async calculatePerformanceTrends(businessId: string): Promise<any> {
    // Implementation for calculating performance trends
    return {
      revenue: { current: 100, previous: 90, change: 10, changePercent: 11.1, direction: 'up' },
      winRate: { current: 65, previous: 60, change: 5, changePercent: 8.3, direction: 'up' },
      satisfaction: { current: 4.5, previous: 4.3, change: 0.2, changePercent: 4.7, direction: 'up' },
    };
  }

  /**
   * Helper: Identify market opportunities
   */
  private static async identifyMarketOpportunities(category: string, stats: any): Promise<string[]> {
    const opportunities: string[] = [];
    
    if (stats.avg_responses < 3) {
      opportunities.push('Low competition - great opportunity for new entrants');
    }
    
    if (stats.avg_indigenous < 1) {
      opportunities.push('Underrepresented Indigenous participation');
    }

    return opportunities;
  }

  /**
   * Helper: Identify business strengths
   */
  private static async identifyStrengths(businessId: string): Promise<string[]> {
    // Implementation for identifying business strengths
    return ['High win rate', 'Fast response times', 'Excellent customer satisfaction'];
  }

  /**
   * Helper: Identify business opportunities
   */
  private static async identifyBusinessOpportunities(businessId: string): Promise<string[]> {
    // Implementation for identifying opportunities
    return ['Expand to adjacent markets', 'Increase bid frequency', 'Improve pricing strategy'];
  }

  /**
   * Helper: Extract business features for ML
   */
  private static async extractBusinessFeatures(businessId: string): Promise<number[]> {
    // Implementation for extracting business features
    return [1, 2, 3, 4, 5]; // Placeholder
  }

  /**
   * Helper: Categorize churn risk
   */
  private static categorizeChurnRisk(probability: number): 'low' | 'medium' | 'high' {
    if (probability > 0.7) return 'high';
    if (probability > 0.4) return 'medium';
    return 'low';
  }

  /**
   * Helper: Identify expansion opportunities
   */
  private static async identifyExpansionOpportunities(businessId: string): Promise<string[]> {
    // Implementation for identifying expansion opportunities
    return ['Technology services', 'Construction', 'Professional services'];
  }
}

export default RFQAnalyticsService;