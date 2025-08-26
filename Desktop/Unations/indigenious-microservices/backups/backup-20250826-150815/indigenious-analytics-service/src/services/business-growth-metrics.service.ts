import { prisma } from '../config/database';
import { clickhouse } from '../config/clickhouse';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { MLService } from './ml.service';
import dayjs from 'dayjs';
import * as ss from 'simple-statistics';

export interface GrowthMetrics {
  businessId: string;
  businessName: string;
  isIndigenous: boolean;
  period: string;
  metrics: {
    revenue: GrowthMetric;
    employees: GrowthMetric;
    rfqParticipation: GrowthMetric;
    winRate: GrowthMetric;
    marketShare: GrowthMetric;
    customerSatisfaction: GrowthMetric;
    certifications: GrowthMetric;
  };
  trends: {
    overall: TrendAnalysis;
    seasonal: SeasonalAnalysis;
    competitive: CompetitiveAnalysis;
  };
  predictions: {
    nextQuarter: GrowthPrediction;
    nextYear: GrowthPrediction;
    riskFactors: RiskFactor[];
  };
  benchmarks: GrowthBenchmarks;
}

interface GrowthMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  momentum: number;
  volatility: number;
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: number;
  consistency: number;
  acceleration: number;
  inflectionPoints: Date[];
}

interface SeasonalAnalysis {
  hasSeasonality: boolean;
  peak: string;
  trough: string;
  amplitude: number;
  consistency: number;
}

interface CompetitiveAnalysis {
  relativePerformance: number;
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  competitiveAdvantage: string[];
  vulnerabilities: string[];
}

interface GrowthPrediction {
  revenue: { value: number; confidence: number };
  employees: { value: number; confidence: number };
  marketShare: { value: number; confidence: number };
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
}

interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  probability: number;
  description: string;
  mitigation: string[];
}

interface GrowthBenchmarks {
  industry: Record<string, number>;
  region: Record<string, number>;
  size: Record<string, number>;
  indigenous: Record<string, number>;
}

export class BusinessGrowthMetricsService {
  private static readonly CACHE_TTL = 7200; // 2 hours

  /**
   * Get comprehensive business growth metrics
   */
  static async getGrowthMetrics(
    businessId: string,
    period: 'month' | 'quarter' | 'year' = 'quarter'
  ): Promise<GrowthMetrics> {
    try {
      const cacheKey = `growth-metrics:${businessId}:${period}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get business data
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          metrics: {
            orderBy: { createdAt: 'desc' },
            take: 24, // Last 24 periods for trend analysis
          },
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      // Calculate growth metrics for each dimension
      const metrics = await this.calculateAllGrowthMetrics(businessId, period);
      
      // Analyze trends
      const trends = await this.analyzeTrends(businessId, period);
      
      // Generate predictions
      const predictions = await this.generateGrowthPredictions(businessId);
      
      // Get benchmarks
      const benchmarks = await this.getBenchmarks(business.industry, business.region, business.isIndigenous);

      const growthMetrics: GrowthMetrics = {
        businessId,
        businessName: business.name,
        isIndigenous: business.isIndigenous,
        period,
        metrics,
        trends,
        predictions,
        benchmarks,
      };

      // Cache the results
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(growthMetrics));

      return growthMetrics;
    } catch (error) {
      logger.error('Failed to get growth metrics', error);
      throw error;
    }
  }

  /**
   * Track Indigenous business growth journey
   */
  static async trackIndigenousGrowthJourney(businessId: string): Promise<{
    milestones: GrowthMilestone[];
    currentStage: GrowthStage;
    nextMilestones: GrowthMilestone[];
    supportPrograms: SupportProgram[];
    culturalMetrics: CulturalGrowthMetrics;
  }> {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          certifications: true,
          partnerships: true,
          communityEngagement: true,
        },
      });

      if (!business || !business.isIndigenous) {
        throw new Error('Indigenous business not found');
      }

      // Get growth milestones
      const milestones = await this.getGrowthMilestones(businessId);
      
      // Determine current growth stage
      const currentStage = await this.determineGrowthStage(businessId);
      
      // Get next milestones
      const nextMilestones = await this.getNextMilestones(businessId, currentStage);
      
      // Get available support programs
      const supportPrograms = await this.getAvailableSupportPrograms(businessId);
      
      // Calculate cultural growth metrics
      const culturalMetrics = await this.calculateCulturalGrowthMetrics(businessId);

      return {
        milestones,
        currentStage,
        nextMilestones,
        supportPrograms,
        culturalMetrics,
      };
    } catch (error) {
      logger.error('Failed to track Indigenous growth journey', error);
      throw error;
    }
  }

  /**
   * Calculate growth velocity and acceleration
   */
  static async calculateGrowthVelocity(businessId: string): Promise<{
    revenue: VelocityMetrics;
    employees: VelocityMetrics;
    contracts: VelocityMetrics;
    overall: VelocityMetrics;
  }> {
    try {
      const query = `
        SELECT
          toStartOfMonth(created_at) as month,
          SUM(revenue_change) as revenue_velocity,
          SUM(employee_change) as employee_velocity,
          SUM(contract_change) as contract_velocity
        FROM business_growth_events
        WHERE business_id = '${businessId}'
        AND created_at >= now() - INTERVAL 12 MONTH
        GROUP BY month
        ORDER BY month
      `;

      const data = await clickhouse.query(query).toPromise();

      const revenueVelocities = data.map((d: any) => d.revenue_velocity);
      const employeeVelocities = data.map((d: any) => d.employee_velocity);
      const contractVelocities = data.map((d: any) => d.contract_velocity);

      return {
        revenue: this.calculateVelocityMetrics(revenueVelocities),
        employees: this.calculateVelocityMetrics(employeeVelocities),
        contracts: this.calculateVelocityMetrics(contractVelocities),
        overall: this.calculateOverallVelocity(revenueVelocities, employeeVelocities, contractVelocities),
      };
    } catch (error) {
      logger.error('Failed to calculate growth velocity', error);
      throw error;
    }
  }

  /**
   * Generate growth strategy recommendations
   */
  static async generateGrowthStrategyRecommendations(businessId: string): Promise<{
    priorityActions: StrategyRecommendation[];
    quickWins: StrategyRecommendation[];
    longTermInitiatives: StrategyRecommendation[];
    indigenousOpportunities: StrategyRecommendation[];
  }> {
    try {
      const [growthMetrics, marketAnalysis, competitorAnalysis] = await Promise.all([
        this.getGrowthMetrics(businessId),
        this.getMarketAnalysis(businessId),
        this.getCompetitorAnalysis(businessId),
      ]);

      // Use ML to generate personalized recommendations
      const features = this.extractGrowthFeatures(growthMetrics, marketAnalysis);
      const recommendations = await MLService.generateRecommendations('growth_strategy', features);

      // Categorize recommendations
      const priorityActions = recommendations
        .filter((r: any) => r.impact === 'high' && r.effort === 'medium')
        .map(this.formatRecommendation);

      const quickWins = recommendations
        .filter((r: any) => r.impact === 'medium' && r.effort === 'low')
        .map(this.formatRecommendation);

      const longTermInitiatives = recommendations
        .filter((r: any) => r.impact === 'high' && r.effort === 'high')
        .map(this.formatRecommendation);

      // Generate Indigenous-specific opportunities
      const indigenousOpportunities = await this.generateIndigenousOpportunities(businessId);

      return {
        priorityActions,
        quickWins,
        longTermInitiatives,
        indigenousOpportunities,
      };
    } catch (error) {
      logger.error('Failed to generate growth strategy recommendations', error);
      throw error;
    }
  }

  /**
   * Analyze growth patterns and cycles
   */
  static async analyzeGrowthPatterns(businessId: string): Promise<{
    patterns: GrowthPattern[];
    cycles: GrowthCycle[];
    anomalies: GrowthAnomaly[];
    insights: GrowthInsight[];
  }> {
    try {
      const query = `
        SELECT
          toStartOfWeek(created_at) as week,
          revenue,
          employees,
          contracts,
          market_events,
          external_factors
        FROM business_weekly_metrics
        WHERE business_id = '${businessId}'
        AND created_at >= now() - INTERVAL 24 MONTH
        ORDER BY week
      `;

      const data = await clickhouse.query(query).toPromise();

      // Detect patterns using statistical analysis
      const patterns = await this.detectGrowthPatterns(data);
      
      // Identify cycles
      const cycles = await this.identifyGrowthCycles(data);
      
      // Find anomalies
      const anomalies = await this.findGrowthAnomalies(data);
      
      // Generate insights
      const insights = await this.generateGrowthInsights(patterns, cycles, anomalies);

      return {
        patterns,
        cycles,
        anomalies,
        insights,
      };
    } catch (error) {
      logger.error('Failed to analyze growth patterns', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate all growth metrics
   */
  private static async calculateAllGrowthMetrics(businessId: string, period: string) {
    const [
      revenueMetric,
      employeesMetric,
      rfqParticipationMetric,
      winRateMetric,
      marketShareMetric,
      satisfactionMetric,
      certificationsMetric,
    ] = await Promise.all([
      this.calculateGrowthMetric(businessId, 'revenue', period),
      this.calculateGrowthMetric(businessId, 'employees', period),
      this.calculateGrowthMetric(businessId, 'rfq_participation', period),
      this.calculateGrowthMetric(businessId, 'win_rate', period),
      this.calculateGrowthMetric(businessId, 'market_share', period),
      this.calculateGrowthMetric(businessId, 'customer_satisfaction', period),
      this.calculateGrowthMetric(businessId, 'certifications', period),
    ]);

    return {
      revenue: revenueMetric,
      employees: employeesMetric,
      rfqParticipation: rfqParticipationMetric,
      winRate: winRateMetric,
      marketShare: marketShareMetric,
      customerSatisfaction: satisfactionMetric,
      certifications: certificationsMetric,
    };
  }

  /**
   * Helper: Calculate individual growth metric
   */
  private static async calculateGrowthMetric(
    businessId: string,
    metric: string,
    period: string
  ): Promise<GrowthMetric> {
    const query = `
      SELECT
        ${metric} as current_value,
        LAG(${metric}) OVER (ORDER BY created_at) as previous_value,
        created_at
      FROM business_metrics
      WHERE business_id = '${businessId}'
      AND created_at >= now() - INTERVAL ${this.getPeriodInterval(period)}
      ORDER BY created_at DESC
      LIMIT 2
    `;

    const result = await clickhouse.query(query).toPromise();
    
    if (result.length < 2) {
      return {
        current: result[0]?.[`${metric}`] || 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        trend: 'stable',
        momentum: 0,
        volatility: 0,
      };
    }

    const current = result[0].current_value;
    const previous = result[0].previous_value;
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    // Calculate momentum and volatility
    const momentum = await this.calculateMomentum(businessId, metric);
    const volatility = await this.calculateVolatility(businessId, metric);

    return {
      current,
      previous,
      change,
      changePercent,
      trend: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
      momentum,
      volatility,
    };
  }

  /**
   * Helper: Analyze trends
   */
  private static async analyzeTrends(businessId: string, period: string) {
    const [overall, seasonal, competitive] = await Promise.all([
      this.analyzeOverallTrend(businessId, period),
      this.analyzeSeasonalTrend(businessId, period),
      this.analyzeCompetitiveTrend(businessId, period),
    ]);

    return { overall, seasonal, competitive };
  }

  /**
   * Helper: Generate growth predictions
   */
  private static async generateGrowthPredictions(businessId: string): Promise<any> {
    const features = await this.extractPredictionFeatures(businessId);
    
    const [nextQuarter, nextYear, riskFactors] = await Promise.all([
      this.predictGrowth(features, 'quarter'),
      this.predictGrowth(features, 'year'),
      this.assessRiskFactors(businessId),
    ]);

    return {
      nextQuarter,
      nextYear,
      riskFactors,
    };
  }

  /**
   * Helper: Get benchmarks
   */
  private static async getBenchmarks(
    industry: string,
    region: string,
    isIndigenous: boolean
  ): Promise<GrowthBenchmarks> {
    const [industryBenchmarks, regionBenchmarks, sizeBenchmarks, indigenousBenchmarks] = 
      await Promise.all([
        this.getIndustryBenchmarks(industry),
        this.getRegionBenchmarks(region),
        this.getSizeBenchmarks('small'), // Assuming small business
        isIndigenous ? this.getIndigenousBenchmarks() : Promise.resolve({}),
      ]);

    return {
      industry: industryBenchmarks,
      region: regionBenchmarks,
      size: sizeBenchmarks,
      indigenous: indigenousBenchmarks,
    };
  }

  /**
   * Helper: Get growth milestones
   */
  private static async getGrowthMilestones(businessId: string): Promise<GrowthMilestone[]> {
    const query = `
      SELECT
        milestone_type,
        milestone_value,
        achieved_at,
        description
      FROM business_milestones
      WHERE business_id = '${businessId}'
      ORDER BY achieved_at DESC
    `;

    const results = await clickhouse.query(query).toPromise();
    return results.map((r: any) => ({
      type: r.milestone_type,
      value: r.milestone_value,
      achievedAt: new Date(r.achieved_at),
      description: r.description,
    }));
  }

  /**
   * Helper: Calculate velocity metrics
   */
  private static calculateVelocityMetrics(velocities: number[]): VelocityMetrics {
    if (velocities.length === 0) {
      return { current: 0, average: 0, acceleration: 0, consistency: 0 };
    }

    const current = velocities[velocities.length - 1];
    const average = ss.mean(velocities);
    
    // Calculate acceleration (change in velocity)
    const acceleration = velocities.length > 1 
      ? velocities[velocities.length - 1] - velocities[velocities.length - 2]
      : 0;
    
    // Calculate consistency (inverse of coefficient of variation)
    const stdDev = ss.standardDeviation(velocities);
    const consistency = average !== 0 ? 1 - (stdDev / Math.abs(average)) : 0;

    return { current, average, acceleration, consistency };
  }

  /**
   * Helper: Get period interval for SQL
   */
  private static getPeriodInterval(period: string): string {
    switch (period) {
      case 'month': return '12 MONTH';
      case 'quarter': return '8 QUARTER';
      case 'year': return '5 YEAR';
      default: return '12 MONTH';
    }
  }

  /**
   * Additional helper methods would be implemented here...
   */
  private static async calculateMomentum(businessId: string, metric: string): Promise<number> {
    // Implementation for calculating momentum
    return 0;
  }

  private static async calculateVolatility(businessId: string, metric: string): Promise<number> {
    // Implementation for calculating volatility
    return 0;
  }

  private static async analyzeOverallTrend(businessId: string, period: string): Promise<TrendAnalysis> {
    // Implementation for overall trend analysis
    return {
      direction: 'up',
      strength: 0.7,
      consistency: 0.8,
      acceleration: 0.1,
      inflectionPoints: [],
    };
  }

  private static async analyzeSeasonalTrend(businessId: string, period: string): Promise<SeasonalAnalysis> {
    // Implementation for seasonal trend analysis
    return {
      hasSeasonality: true,
      peak: 'Q4',
      trough: 'Q1',
      amplitude: 0.3,
      consistency: 0.7,
    };
  }

  private static async analyzeCompetitiveTrend(businessId: string, period: string): Promise<CompetitiveAnalysis> {
    // Implementation for competitive analysis
    return {
      relativePerformance: 1.2,
      marketPosition: 'challenger',
      competitiveAdvantage: ['Indigenous certification', 'Regional expertise'],
      vulnerabilities: ['Limited scale', 'Resource constraints'],
    };
  }
}

// Interface definitions
interface VelocityMetrics {
  current: number;
  average: number;
  acceleration: number;
  consistency: number;
}

interface GrowthMilestone {
  type: string;
  value: number;
  achievedAt: Date;
  description: string;
}

interface GrowthStage {
  stage: 'startup' | 'growth' | 'maturity' | 'expansion';
  characteristics: string[];
  challenges: string[];
  opportunities: string[];
}

interface SupportProgram {
  name: string;
  provider: string;
  type: 'funding' | 'training' | 'mentorship' | 'certification';
  eligibility: string[];
  benefits: string[];
  applicationUrl?: string;
}

interface CulturalGrowthMetrics {
  culturalValueAlignment: number;
  communityEngagement: number;
  traditionalKnowledgeIntegration: number;
  elderMentorship: number;
  youthInvolvement: number;
  languagePreservation: number;
}

interface StrategyRecommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  timeframe: string;
  resources: string[];
  expectedOutcome: string;
}

interface GrowthPattern {
  type: string;
  confidence: number;
  description: string;
  duration: string;
  frequency: string;
}

interface GrowthCycle {
  name: string;
  duration: number;
  phases: string[];
  currentPhase: string;
  nextTransition: Date;
}

interface GrowthAnomaly {
  date: Date;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  possibleCauses: string[];
}

interface GrowthInsight {
  insight: string;
  confidence: number;
  actionable: boolean;
  recommendations: string[];
}

export default BusinessGrowthMetricsService;