import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { clickhouse } from '../config/clickhouse';
import { logger } from '../utils/logger';
import {
  IndigenousAnalytics,
  RegionMetrics,
  BandMetrics,
  IndustryMetrics,
  CertificationStats,
  ProcurementTrend,
} from '../types/analytics.types';
import dayjs from 'dayjs';

export class IndigenousAnalyticsService {
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Get comprehensive Indigenous procurement analytics
   */
  static async getIndigenousAnalytics(
    dateRange?: { start: Date; end: Date }
  ): Promise<IndigenousAnalytics> {
    try {
      const cacheKey = `indigenous-analytics:${dateRange?.start}:${dateRange?.end}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Parallel data fetching
      const [
        businessStats,
        rfqStats,
        regionMetrics,
        bandMetrics,
        industryMetrics,
        certificationStats,
        procurementTrends,
      ] = await Promise.all([
        this.getBusinessStatistics(dateRange),
        this.getRFQStatistics(dateRange),
        this.getRegionMetrics(dateRange),
        this.getBandMetrics(dateRange),
        this.getIndustryMetrics(dateRange),
        this.getCertificationStatistics(),
        this.getProcurementTrends(dateRange),
      ]);

      const analytics: IndigenousAnalytics = {
        totalIndigenousBusinesses: businessStats.total,
        totalRFQsToIndigenous: rfqStats.totalToIndigenous,
        totalValueToIndigenous: rfqStats.totalValue,
        growthRate: this.calculateGrowthRate(businessStats),
        byRegion: regionMetrics,
        byBand: bandMetrics,
        byIndustry: industryMetrics,
        certificationStats,
        procurementTrends,
      };

      // Cache the results
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analytics));

      return analytics;
    } catch (error) {
      logger.error('Failed to get Indigenous analytics', error);
      throw error;
    }
  }

  /**
   * Get Indigenous business statistics
   */
  private static async getBusinessStatistics(dateRange?: { start: Date; end: Date }) {
    const where: any = {
      isIndigenous: true,
      verified: true,
    };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const [total, newThisMonth, activeCount] = await Promise.all([
      prisma.business.count({ where }),
      prisma.business.count({
        where: {
          ...where,
          createdAt: {
            gte: dayjs().startOf('month').toDate(),
          },
        },
      }),
      prisma.business.count({
        where: {
          ...where,
          lastActiveAt: {
            gte: dayjs().subtract(30, 'days').toDate(),
          },
        },
      }),
    ]);

    return {
      total,
      newThisMonth,
      activeCount,
      activeRate: (activeCount / total) * 100,
    };
  }

  /**
   * Get RFQ statistics for Indigenous businesses
   */
  private static async getRFQStatistics(dateRange?: { start: Date; end: Date }) {
    const query = `
      SELECT
        COUNT(DISTINCT rfq_id) as total_rfqs,
        COUNT(DISTINCT CASE WHEN is_indigenous_winner = true THEN rfq_id END) as indigenous_wins,
        SUM(CASE WHEN is_indigenous_winner = true THEN contract_value ELSE 0 END) as total_value,
        AVG(CASE WHEN is_indigenous_winner = true THEN response_time END) as avg_response_time
      FROM rfq_analytics
      WHERE 1=1
      ${dateRange ? `AND created_at BETWEEN '${dateRange.start.toISOString()}' AND '${dateRange.end.toISOString()}'` : ''}
    `;

    const result = await clickhouse.query(query).toPromise();
    const stats = result[0];

    return {
      totalToIndigenous: stats.indigenous_wins || 0,
      totalValue: stats.total_value || 0,
      winRate: (stats.indigenous_wins / stats.total_rfqs) * 100,
      avgResponseTime: stats.avg_response_time || 0,
    };
  }

  /**
   * Get metrics by region
   */
  private static async getRegionMetrics(
    dateRange?: { start: Date; end: Date }
  ): Promise<Record<string, RegionMetrics>> {
    const regions = await prisma.indigenousRegistry.groupBy({
      by: ['region'],
      _count: {
        businessId: true,
      },
      where: dateRange ? {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      } : undefined,
    });

    const metrics: Record<string, RegionMetrics> = {};

    for (const region of regions) {
      const rfqStats = await this.getRegionRFQStats(region.region, dateRange);
      
      metrics[region.region] = {
        businessCount: region._count.businessId,
        rfqCount: rfqStats.rfqCount,
        totalValue: rfqStats.totalValue,
        averageResponseTime: rfqStats.avgResponseTime,
        winRate: rfqStats.winRate,
      };
    }

    return metrics;
  }

  /**
   * Get metrics by band
   */
  private static async getBandMetrics(
    dateRange?: { start: Date; end: Date }
  ): Promise<Record<string, BandMetrics>> {
    const bands = await prisma.indigenousRegistry.findMany({
      select: {
        bandNumber: true,
        bandName: true,
        businesses: {
          select: {
            id: true,
            rfqsParticipated: {
              where: dateRange ? {
                createdAt: {
                  gte: dateRange.start,
                  lte: dateRange.end,
                },
              } : undefined,
              select: {
                id: true,
                status: true,
                contractValue: true,
              },
            },
          },
        },
      },
    });

    const metrics: Record<string, BandMetrics> = {};

    bands.forEach(band => {
      const activeRFQs = band.businesses.reduce(
        (sum, biz) => sum + biz.rfqsParticipated.filter(r => r.status === 'ACTIVE').length,
        0
      );
      
      const completedProjects = band.businesses.reduce(
        (sum, biz) => sum + biz.rfqsParticipated.filter(r => r.status === 'COMPLETED').length,
        0
      );
      
      const totalRevenue = band.businesses.reduce(
        (sum, biz) => sum + biz.rfqsParticipated.reduce(
          (rfqSum, rfq) => rfqSum + (rfq.contractValue || 0),
          0
        ),
        0
      );

      metrics[band.bandNumber] = {
        bandName: band.bandName,
        bandNumber: band.bandNumber,
        businessCount: band.businesses.length,
        activeRFQs,
        completedProjects,
        totalRevenue,
      };
    });

    return metrics;
  }

  /**
   * Get metrics by industry
   */
  private static async getIndustryMetrics(
    dateRange?: { start: Date; end: Date }
  ): Promise<Record<string, IndustryMetrics>> {
    const query = `
      SELECT
        industry,
        COUNT(DISTINCT business_id) as business_count,
        COUNT(DISTINCT rfq_id) as rfq_count,
        AVG(contract_value) as avg_contract_value,
        (COUNT(DISTINCT business_id) - LAG(COUNT(DISTINCT business_id)) OVER (ORDER BY industry)) / 
        NULLIF(LAG(COUNT(DISTINCT business_id)) OVER (ORDER BY industry), 0) * 100 as growth_rate
      FROM business_analytics
      WHERE is_indigenous = true
      ${dateRange ? `AND created_at BETWEEN '${dateRange.start.toISOString()}' AND '${dateRange.end.toISOString()}'` : ''}
      GROUP BY industry
    `;

    const results = await clickhouse.query(query).toPromise();
    const metrics: Record<string, IndustryMetrics> = {};

    results.forEach((row: any) => {
      metrics[row.industry] = {
        industry: row.industry,
        businessCount: row.business_count,
        rfqCount: row.rfq_count,
        averageContractValue: row.avg_contract_value,
        growthRate: row.growth_rate || 0,
      };
    });

    return metrics;
  }

  /**
   * Get certification statistics
   */
  private static async getCertificationStatistics(): Promise<CertificationStats> {
    const [
      totalCertified,
      pendingCertifications,
      expiringCertifications,
      certificationTypes,
      avgProcessingTime,
    ] = await Promise.all([
      prisma.certification.count({
        where: {
          status: 'ACTIVE',
          type: 'INDIGENOUS_BUSINESS',
        },
      }),
      prisma.certification.count({
        where: {
          status: 'PENDING',
          type: 'INDIGENOUS_BUSINESS',
        },
      }),
      prisma.certification.count({
        where: {
          status: 'ACTIVE',
          type: 'INDIGENOUS_BUSINESS',
          validUntil: {
            lte: dayjs().add(30, 'days').toDate(),
            gte: new Date(),
          },
        },
      }),
      this.getCertificationTypeBreakdown(),
      this.getAverageProcessingTime(),
    ]);

    return {
      totalCertified,
      pendingCertifications,
      expiringCertifications,
      certificationTypes,
      averageProcessingTime: avgProcessingTime,
    };
  }

  /**
   * Get procurement trends
   */
  private static async getProcurementTrends(
    dateRange?: { start: Date; end: Date }
  ): Promise<ProcurementTrend[]> {
    const periods = this.generatePeriods(dateRange);
    const trends: ProcurementTrend[] = [];

    for (const period of periods) {
      const query = `
        SELECT
          COUNT(DISTINCT rfq_id) as rfq_count,
          SUM(contract_value) as total_value,
          COUNT(DISTINCT CASE WHEN is_indigenous_participant = true THEN business_id END) as indigenous_participation,
          AVG(bid_count) as avg_bid_count,
          COUNT(CASE WHEN is_indigenous_winner = true THEN 1 END) * 100.0 / COUNT(*) as success_rate
        FROM rfq_analytics
        WHERE created_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      `;

      const result = await clickhouse.query(query).toPromise();
      const stats = result[0];

      trends.push({
        period: period.label,
        rfqCount: stats.rfq_count || 0,
        totalValue: stats.total_value || 0,
        indigenousParticipation: stats.indigenous_participation || 0,
        averageBidCount: stats.avg_bid_count || 0,
        successRate: stats.success_rate || 0,
      });
    }

    return trends;
  }

  /**
   * Track Indigenous business growth
   */
  static async trackIndigenousGrowth(businessId: string, metrics: {
    revenue: number;
    employeeCount: number;
    rfqsWon: number;
    certifications: string[];
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO indigenous_growth_metrics
        (business_id, revenue, employee_count, rfqs_won, certifications, timestamp)
        VALUES
        ('${businessId}', ${metrics.revenue}, ${metrics.employeeCount}, 
         ${metrics.rfqsWon}, ['${metrics.certifications.join("','")}'], now())
      `;

      await clickhouse.query(query).toPromise();

      // Update aggregated metrics
      await this.updateAggregatedGrowthMetrics(businessId);

      logger.info('Indigenous growth metrics tracked', { businessId, metrics });
    } catch (error) {
      logger.error('Failed to track Indigenous growth', error);
      throw error;
    }
  }

  /**
   * Get Indigenous business rankings
   */
  static async getIndigenousRankings(category: string): Promise<any[]> {
    try {
      const query = `
        SELECT
          business_id,
          business_name,
          band_name,
          region,
          total_revenue,
          rfqs_won,
          win_rate,
          growth_rate,
          RANK() OVER (ORDER BY ${this.getRankingMetric(category)} DESC) as ranking
        FROM indigenous_business_performance
        WHERE is_active = true
        ORDER BY ranking
        LIMIT 100
      `;

      const results = await clickhouse.query(query).toPromise();
      return results;
    } catch (error) {
      logger.error('Failed to get Indigenous rankings', error);
      throw error;
    }
  }

  /**
   * Analyze Indigenous procurement patterns
   */
  static async analyzeIndigenousProcurementPatterns(): Promise<any> {
    try {
      const patterns = await this.detectProcurementPatterns();
      const seasonality = await this.analyzeSeasonality();
      const opportunities = await this.identifyOpportunities();
      const recommendations = await this.generateRecommendations();

      return {
        patterns,
        seasonality,
        opportunities,
        recommendations,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to analyze procurement patterns', error);
      throw error;
    }
  }

  /**
   * Helper: Get region RFQ statistics
   */
  private static async getRegionRFQStats(region: string, dateRange?: { start: Date; end: Date }) {
    const query = `
      SELECT
        COUNT(DISTINCT rfq_id) as rfq_count,
        SUM(contract_value) as total_value,
        AVG(response_time_hours) as avg_response_time,
        COUNT(CASE WHEN is_winner = true THEN 1 END) * 100.0 / COUNT(*) as win_rate
      FROM rfq_participation
      WHERE region = '${region}'
      ${dateRange ? `AND created_at BETWEEN '${dateRange.start.toISOString()}' AND '${dateRange.end.toISOString()}'` : ''}
    `;

    const result = await clickhouse.query(query).toPromise();
    return {
      rfqCount: result[0]?.rfq_count || 0,
      totalValue: result[0]?.total_value || 0,
      avgResponseTime: result[0]?.avg_response_time || 0,
      winRate: result[0]?.win_rate || 0,
    };
  }

  /**
   * Helper: Get certification type breakdown
   */
  private static async getCertificationTypeBreakdown(): Promise<Record<string, number>> {
    const types = await prisma.certification.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
      where: {
        status: 'ACTIVE',
      },
    });

    const breakdown: Record<string, number> = {};
    types.forEach(type => {
      breakdown[type.type] = type._count.id;
    });

    return breakdown;
  }

  /**
   * Helper: Get average certification processing time
   */
  private static async getAverageProcessingTime(): Promise<number> {
    const result = await prisma.$queryRaw<any[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
      FROM certifications
      WHERE status = 'ACTIVE'
      AND created_at >= NOW() - INTERVAL '90 days'
    `;

    return result[0]?.avg_hours || 0;
  }

  /**
   * Helper: Calculate growth rate
   */
  private static calculateGrowthRate(stats: any): number {
    const previousMonth = stats.total - stats.newThisMonth;
    if (previousMonth === 0) return 100;
    return ((stats.newThisMonth / previousMonth) * 100).toFixed(2) as any;
  }

  /**
   * Helper: Generate time periods
   */
  private static generatePeriods(dateRange?: { start: Date; end: Date }) {
    const periods = [];
    const start = dateRange?.start || dayjs().subtract(12, 'months').toDate();
    const end = dateRange?.end || new Date();
    
    let current = dayjs(start);
    while (current.isBefore(end)) {
      periods.push({
        label: current.format('YYYY-MM'),
        start: current.toDate(),
        end: current.endOf('month').toDate(),
      });
      current = current.add(1, 'month');
    }

    return periods;
  }

  /**
   * Helper: Get ranking metric
   */
  private static getRankingMetric(category: string): string {
    const metrics: Record<string, string> = {
      revenue: 'total_revenue',
      growth: 'growth_rate',
      participation: 'rfqs_won',
      efficiency: 'win_rate',
    };
    return metrics[category] || 'total_revenue';
  }

  /**
   * Helper: Update aggregated growth metrics
   */
  private static async updateAggregatedGrowthMetrics(businessId: string): Promise<void> {
    // Implementation for updating aggregated metrics in ClickHouse
    const query = `
      INSERT INTO indigenous_growth_aggregated
      SELECT
        business_id,
        toStartOfMonth(timestamp) as month,
        avg(revenue) as avg_revenue,
        max(employee_count) as max_employees,
        sum(rfqs_won) as total_rfqs_won,
        uniqExact(arrayJoin(certifications)) as unique_certifications
      FROM indigenous_growth_metrics
      WHERE business_id = '${businessId}'
      GROUP BY business_id, month
    `;

    await clickhouse.query(query).toPromise();
  }

  /**
   * Helper: Detect procurement patterns
   */
  private static async detectProcurementPatterns(): Promise<any> {
    // Machine learning pattern detection
    const query = `
      SELECT
        category,
        COUNT(*) as frequency,
        AVG(contract_value) as avg_value,
        STDDEV(contract_value) as value_variance,
        AVG(bid_count) as avg_competition
      FROM rfq_analytics
      WHERE is_indigenous_participant = true
      GROUP BY category
      HAVING frequency > 10
      ORDER BY frequency DESC
    `;

    const results = await clickhouse.query(query).toPromise();
    return results;
  }

  /**
   * Helper: Analyze seasonality
   */
  private static async analyzeSeasonality(): Promise<any> {
    const query = `
      SELECT
        toMonth(created_at) as month,
        COUNT(*) as rfq_count,
        AVG(contract_value) as avg_value
      FROM rfq_analytics
      WHERE is_indigenous_participant = true
      GROUP BY month
      ORDER BY month
    `;

    const results = await clickhouse.query(query).toPromise();
    return results;
  }

  /**
   * Helper: Identify opportunities
   */
  private static async identifyOpportunities(): Promise<any[]> {
    const opportunities = [];

    // Underserved categories
    const underserved = await this.findUnderservedCategories();
    opportunities.push(...underserved);

    // High growth sectors
    const highGrowth = await this.findHighGrowthSectors();
    opportunities.push(...highGrowth);

    // Regional gaps
    const regionalGaps = await this.findRegionalGaps();
    opportunities.push(...regionalGaps);

    return opportunities;
  }

  /**
   * Helper: Generate recommendations
   */
  private static async generateRecommendations(): Promise<string[]> {
    const recommendations = [];

    // Based on current metrics
    const metrics = await this.getIndigenousAnalytics();

    if (metrics.certificationStats.pendingCertifications > 10) {
      recommendations.push('Streamline certification process to reduce pending applications');
    }

    if (metrics.growthRate < 5) {
      recommendations.push('Implement targeted outreach programs to increase Indigenous business participation');
    }

    // Add more recommendation logic based on patterns

    return recommendations;
  }

  /**
   * Helper: Find underserved categories
   */
  private static async findUnderservedCategories(): Promise<any[]> {
    const query = `
      SELECT
        category,
        COUNT(DISTINCT business_id) as supplier_count,
        COUNT(DISTINCT rfq_id) as demand_count,
        demand_count / NULLIF(supplier_count, 0) as demand_supply_ratio
      FROM rfq_category_analysis
      WHERE demand_supply_ratio > 5
      ORDER BY demand_supply_ratio DESC
      LIMIT 10
    `;

    const results = await clickhouse.query(query).toPromise();
    return results.map((r: any) => ({
      type: 'underserved_category',
      category: r.category,
      opportunity: `High demand with low Indigenous supplier participation`,
      potential: r.demand_supply_ratio,
    }));
  }

  /**
   * Helper: Find high growth sectors
   */
  private static async findHighGrowthSectors(): Promise<any[]> {
    const query = `
      SELECT
        industry,
        growth_rate,
        total_value,
        business_count
      FROM industry_growth_metrics
      WHERE growth_rate > 20
      AND business_count < 50
      ORDER BY growth_rate DESC
      LIMIT 10
    `;

    const results = await clickhouse.query(query).toPromise();
    return results.map((r: any) => ({
      type: 'high_growth',
      industry: r.industry,
      opportunity: `Rapidly growing sector with room for more Indigenous businesses`,
      growthRate: r.growth_rate,
    }));
  }

  /**
   * Helper: Find regional gaps
   */
  private static async findRegionalGaps(): Promise<any[]> {
    const query = `
      SELECT
        region,
        rfq_count,
        indigenous_business_count,
        rfq_count / NULLIF(indigenous_business_count, 0) as opportunity_ratio
      FROM regional_analysis
      WHERE opportunity_ratio > 10
      ORDER BY opportunity_ratio DESC
      LIMIT 10
    `;

    const results = await clickhouse.query(query).toPromise();
    return results.map((r: any) => ({
      type: 'regional_gap',
      region: r.region,
      opportunity: `High RFQ volume with low Indigenous business presence`,
      ratio: r.opportunity_ratio,
    }));
  }
}

export default IndigenousAnalyticsService;