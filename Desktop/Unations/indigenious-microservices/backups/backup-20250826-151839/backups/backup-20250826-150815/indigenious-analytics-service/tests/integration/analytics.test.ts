import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server';
import { IndigenousAnalyticsService } from '../../src/services/indigenous-analytics.service';
import { RFQAnalyticsService } from '../../src/services/rfq-analytics.service';
import { BusinessGrowthMetricsService } from '../../src/services/business-growth-metrics.service';
import { MLService } from '../../src/services/ml.service';
import { DataAggregatorService } from '../../src/services/data-aggregator.service';
import jwt from 'jsonwebtoken';

describe('Analytics Service Integration Tests', () => {
  let authToken: string;
  let adminToken: string;
  let businessToken: string;
  const businessId = 'business-123';
  const rfqId = 'rfq-456';
  const userId = 'user-789';

  beforeAll(() => {
    // Generate auth tokens
    authToken = jwt.sign(
      { userId, businessId, role: 'business_owner' },
      process.env.JWT_SECRET || 'test-secret'
    );
    
    adminToken = jwt.sign(
      { userId: 'admin-123', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret'
    );
    
    businessToken = jwt.sign(
      { userId: 'business-user', businessId, role: 'business_owner' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Indigenous Analytics', () => {
    describe('GET /api/v1/analytics/indigenous', () => {
      it('should return comprehensive Indigenous procurement analytics', async () => {
        const mockAnalytics = {
          totalIndigenousBusinesses: 150,
          totalRFQsToIndigenous: 89,
          totalValueToIndigenous: 2500000,
          growthRate: 15.5,
          byRegion: {
            'Ontario': {
              businessCount: 45,
              rfqCount: 32,
              totalValue: 850000,
              averageResponseTime: 3.2,
              winRate: 68.5,
            },
            'British Columbia': {
              businessCount: 38,
              rfqCount: 28,
              totalValue: 720000,
              averageResponseTime: 2.9,
              winRate: 71.2,
            },
          },
          byBand: {
            '123': {
              bandName: 'Test First Nation',
              bandNumber: '123',
              businessCount: 12,
              activeRFQs: 8,
              completedProjects: 15,
              totalRevenue: 450000,
            },
          },
          certificationStats: {
            totalCertified: 120,
            pendingCertifications: 25,
            expiringCertifications: 8,
            certificationTypes: {
              'INDIGENOUS_BUSINESS': 95,
              'MINORITY_OWNED': 15,
              'WOMEN_OWNED': 10,
            },
            averageProcessingTime: 14.5,
          },
          procurementTrends: [
            {
              period: '2024-01',
              rfqCount: 25,
              totalValue: 580000,
              indigenousParticipation: 18,
              averageBidCount: 4.2,
              successRate: 72.5,
            },
          ],
        };

        jest.spyOn(IndigenousAnalyticsService, 'getIndigenousAnalytics')
          .mockResolvedValue(mockAnalytics as any);

        const response = await request(app)
          .get('/api/v1/analytics/indigenous')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('totalIndigenousBusinesses', 150);
        expect(response.body).toHaveProperty('growthRate', 15.5);
        expect(response.body.byRegion).toHaveProperty('Ontario');
        expect(response.body.certificationStats.totalCertified).toBe(120);
        expect(response.body.procurementTrends).toHaveLength(1);
      });

      it('should filter analytics by date range', async () => {
        const mockAnalytics = {
          totalIndigenousBusinesses: 85,
          totalRFQsToIndigenous: 45,
          totalValueToIndigenous: 1200000,
          growthRate: 12.3,
        };

        jest.spyOn(IndigenousAnalyticsService, 'getIndigenousAnalytics')
          .mockResolvedValue(mockAnalytics as any);

        const response = await request(app)
          .get('/api/v1/analytics/indigenous')
          .query({
            startDate: '2024-01-01',
            endDate: '2024-03-31',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.totalIndigenousBusinesses).toBe(85);
        expect(IndigenousAnalyticsService.getIndigenousAnalytics).toHaveBeenCalledWith({
          start: new Date('2024-01-01'),
          end: new Date('2024-03-31'),
        });
      });

      it('should require admin role for Indigenous analytics', async () => {
        const response = await request(app)
          .get('/api/v1/analytics/indigenous')
          .set('Authorization', `Bearer ${businessToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('POST /api/v1/analytics/indigenous/track-growth', () => {
      it('should track Indigenous business growth metrics', async () => {
        const growthData = {
          revenue: 125000,
          employeeCount: 8,
          rfqsWon: 5,
          certifications: ['INDIGENOUS_BUSINESS', 'ISO_9001'],
        };

        jest.spyOn(IndigenousAnalyticsService, 'trackIndigenousGrowth')
          .mockResolvedValue();

        const response = await request(app)
          .post('/api/v1/analytics/indigenous/track-growth')
          .set('Authorization', `Bearer ${businessToken}`)
          .send(growthData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Growth metrics tracked successfully');
        expect(IndigenousAnalyticsService.trackIndigenousGrowth)
          .toHaveBeenCalledWith(businessId, growthData);
      });
    });

    describe('GET /api/v1/analytics/indigenous/rankings/:category', () => {
      it('should return Indigenous business rankings', async () => {
        const mockRankings = [
          {
            business_id: 'biz-1',
            business_name: 'Indigenous Tech Solutions',
            band_name: 'Test First Nation',
            region: 'Ontario',
            total_revenue: 850000,
            rfqs_won: 12,
            win_rate: 75.5,
            growth_rate: 18.2,
            ranking: 1,
          },
          {
            business_id: 'biz-2',
            business_name: 'Native Construction Co',
            band_name: 'Another First Nation',
            region: 'BC',
            total_revenue: 720000,
            rfqs_won: 10,
            win_rate: 68.3,
            growth_rate: 14.7,
            ranking: 2,
          },
        ];

        jest.spyOn(IndigenousAnalyticsService, 'getIndigenousRankings')
          .mockResolvedValue(mockRankings);

        const response = await request(app)
          .get('/api/v1/analytics/indigenous/rankings/revenue')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].ranking).toBe(1);
        expect(response.body[0].business_name).toBe('Indigenous Tech Solutions');
      });
    });
  });

  describe('RFQ Analytics', () => {
    describe('GET /api/v1/analytics/rfq/:rfqId', () => {
      it('should return comprehensive RFQ analysis', async () => {
        const mockAnalysis = {
          rfqId,
          title: 'Software Development Services',
          status: 'COMPLETED',
          createdAt: new Date('2024-01-15'),
          responseCount: 8,
          indigenousResponseCount: 3,
          averageResponseTime: 2.5,
          estimatedValue: 50000,
          actualValue: 48000,
          winnerBusinessId: 'winner-123',
          isIndigenousWinner: true,
          competitionLevel: 'medium' as const,
          categoryBreakdown: [
            {
              category: 'Technology',
              responseCount: 5,
              averagePrice: 47000,
              priceRange: { min: 42000, max: 52000 },
            },
            {
              category: 'Consulting',
              responseCount: 3,
              averagePrice: 49000,
              priceRange: { min: 45000, max: 55000 },
            },
          ],
        };

        jest.spyOn(RFQAnalyticsService, 'analyzeRFQ')
          .mockResolvedValue(mockAnalysis);

        const response = await request(app)
          .get(`/api/v1/analytics/rfq/${rfqId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.rfqId).toBe(rfqId);
        expect(response.body.responseCount).toBe(8);
        expect(response.body.indigenousResponseCount).toBe(3);
        expect(response.body.isIndigenousWinner).toBe(true);
        expect(response.body.competitionLevel).toBe('medium');
        expect(response.body.categoryBreakdown).toHaveLength(2);
      });

      it('should handle non-existent RFQ', async () => {
        jest.spyOn(RFQAnalyticsService, 'analyzeRFQ')
          .mockRejectedValue(new Error('RFQ not found'));

        const response = await request(app)
          .get('/api/v1/analytics/rfq/non-existent')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('not found');
      });
    });

    describe('POST /api/v1/analytics/rfq/predict-success', () => {
      it('should predict RFQ success probability', async () => {
        const rfqData = {
          estimatedBudget: 75000,
          daysUntilDeadline: 14,
          requirementsComplexity: 7,
          categoryCompetitiveness: 8,
          businessCount: 25,
          isUrgent: false,
        };

        const mockPrediction = {
          successProbability: 78.5,
          expectedResponses: 6,
          recommendedActions: [
            'Extend deadline by 3 days for better responses',
            'Clarify technical requirements in section 3',
            'Consider splitting into smaller contracts',
          ],
        };

        jest.spyOn(MLService, 'predictRFQSuccess')
          .mockResolvedValue(mockPrediction);

        const response = await request(app)
          .post('/api/v1/analytics/rfq/predict-success')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(rfqData);

        expect(response.status).toBe(200);
        expect(response.body.successProbability).toBe(78.5);
        expect(response.body.expectedResponses).toBe(6);
        expect(response.body.recommendedActions).toHaveLength(3);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/analytics/rfq/predict-success')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            estimatedBudget: 75000,
            // Missing required fields
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });
    });

    describe('GET /api/v1/analytics/rfq/market-competition/:category', () => {
      it('should analyze market competition for category', async () => {
        const mockCompetition = {
          competitionLevel: 'high' as const,
          averageResponseCount: 8.5,
          indigenousParticipation: 35.2,
          priceVariance: 15.7,
          marketLeaders: [
            {
              business_id: 'leader-1',
              business_name: 'Market Leader Inc',
              wins: 15,
              total_value: 1250000,
              is_indigenous: false,
            },
          ],
          opportunities: [
            'Underrepresented Indigenous participation',
            'High price variance suggests room for competitive pricing',
          ],
        };

        jest.spyOn(RFQAnalyticsService, 'analyzeMarketCompetition')
          .mockResolvedValue(mockCompetition);

        const response = await request(app)
          .get('/api/v1/analytics/rfq/market-competition/technology')
          .query({ region: 'Ontario' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.competitionLevel).toBe('high');
        expect(response.body.averageResponseCount).toBe(8.5);
        expect(response.body.indigenousParticipation).toBe(35.2);
        expect(response.body.opportunities).toHaveLength(2);
      });
    });
  });

  describe('Business Analytics', () => {
    describe('GET /api/v1/analytics/business/:businessId', () => {
      it('should return comprehensive business analytics', async () => {
        const mockAnalytics = {
          businessId,
          businessName: 'Test Indigenous Business',
          isIndigenous: true,
          metrics: {
            totalRFQsParticipated: 25,
            totalRFQsWon: 18,
            winRate: 72.0,
            averageResponseTime: 2.8,
            totalRevenue: 850000,
            averageContractValue: 47222,
            customerSatisfaction: 4.6,
            growthRate: 18.5,
          },
          performance: {
            onTimeDelivery: 92.5,
            qualityScore: 4.7,
            communicationScore: 4.5,
            overallRating: 4.6,
            trends: {
              revenue: {
                current: 850000,
                previous: 720000,
                change: 130000,
                changePercent: 18.1,
                direction: 'up' as const,
              },
              winRate: {
                current: 72.0,
                previous: 68.5,
                change: 3.5,
                changePercent: 5.1,
                direction: 'up' as const,
              },
              satisfaction: {
                current: 4.6,
                previous: 4.4,
                change: 0.2,
                changePercent: 4.5,
                direction: 'up' as const,
              },
            },
          },
          competitivePosition: {
            marketShare: 8.5,
            ranking: 3,
            totalCompetitors: 45,
            strengths: ['Indigenous certification', 'Strong community ties', 'Technical expertise'],
            opportunities: ['Expand service offerings', 'Geographic expansion', 'Partnership development'],
          },
          predictions: {
            nextMonthRevenue: 95000,
            nextQuarterGrowth: 22.5,
            rfqWinProbability: 75.2,
            churnRisk: 'low' as const,
            expansionOpportunities: ['Cloud services', 'Data analytics', 'Mobile development'],
          },
        };

        jest.spyOn(RFQAnalyticsService, 'getBusinessAnalytics')
          .mockResolvedValue(mockAnalytics);

        const response = await request(app)
          .get(`/api/v1/analytics/business/${businessId}`)
          .set('Authorization', `Bearer ${businessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.businessId).toBe(businessId);
        expect(response.body.isIndigenous).toBe(true);
        expect(response.body.metrics.winRate).toBe(72.0);
        expect(response.body.performance.onTimeDelivery).toBe(92.5);
        expect(response.body.competitivePosition.ranking).toBe(3);
        expect(response.body.predictions.churnRisk).toBe('low');
      });

      it('should restrict access to business owner', async () => {
        const response = await request(app)
          .get(`/api/v1/analytics/business/other-business-id`)
          .set('Authorization', `Bearer ${businessToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('access denied');
      });
    });

    describe('GET /api/v1/analytics/business/:businessId/growth', () => {
      it('should return business growth metrics', async () => {
        const mockGrowthMetrics = {
          businessId,
          businessName: 'Test Indigenous Business',
          isIndigenous: true,
          period: 'quarter',
          metrics: {
            revenue: {
              current: 850000,
              previous: 720000,
              change: 130000,
              changePercent: 18.1,
              trend: 'increasing' as const,
              momentum: 0.85,
              volatility: 0.12,
            },
            employees: {
              current: 12,
              previous: 10,
              change: 2,
              changePercent: 20.0,
              trend: 'increasing' as const,
              momentum: 0.75,
              volatility: 0.08,
            },
          },
          trends: {
            overall: {
              direction: 'up' as const,
              strength: 0.82,
              consistency: 0.78,
              acceleration: 0.15,
              inflectionPoints: [],
            },
            seasonal: {
              hasSeasonality: true,
              peak: 'Q4',
              trough: 'Q1',
              amplitude: 0.25,
              consistency: 0.70,
            },
            competitive: {
              relativePerformance: 1.25,
              marketPosition: 'challenger' as const,
              competitiveAdvantage: ['Indigenous status', 'Local expertise'],
              vulnerabilities: ['Limited scale', 'Resource constraints'],
            },
          },
          predictions: {
            nextQuarter: {
              revenue: { value: 950000, confidence: 0.78 },
              employees: { value: 14, confidence: 0.72 },
              marketShare: { value: 9.2, confidence: 0.65 },
              scenarios: {
                optimistic: 1100000,
                realistic: 950000,
                pessimistic: 800000,
              },
            },
            nextYear: {
              revenue: { value: 4200000, confidence: 0.65 },
              employees: { value: 18, confidence: 0.58 },
              marketShare: { value: 12.5, confidence: 0.55 },
              scenarios: {
                optimistic: 5000000,
                realistic: 4200000,
                pessimistic: 3500000,
              },
            },
            riskFactors: [
              {
                factor: 'Economic downturn',
                impact: 'high' as const,
                probability: 0.25,
                description: 'General economic slowdown could reduce procurement spending',
                mitigation: ['Diversify client base', 'Build cash reserves', 'Focus on essential services'],
              },
            ],
          },
          benchmarks: {
            industry: {
              revenueGrowth: 12.5,
              employeeGrowth: 8.3,
              winRate: 65.2,
            },
            region: {
              revenueGrowth: 14.8,
              employeeGrowth: 9.1,
              winRate: 68.7,
            },
            size: {
              revenueGrowth: 16.2,
              employeeGrowth: 11.5,
              winRate: 70.1,
            },
            indigenous: {
              revenueGrowth: 19.7,
              employeeGrowth: 13.8,
              winRate: 73.5,
            },
          },
        };

        jest.spyOn(BusinessGrowthMetricsService, 'getGrowthMetrics')
          .mockResolvedValue(mockGrowthMetrics);

        const response = await request(app)
          .get(`/api/v1/analytics/business/${businessId}/growth`)
          .query({ period: 'quarter' })
          .set('Authorization', `Bearer ${businessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.businessId).toBe(businessId);
        expect(response.body.period).toBe('quarter');
        expect(response.body.metrics.revenue.changePercent).toBe(18.1);
        expect(response.body.trends.overall.direction).toBe('up');
        expect(response.body.predictions.riskFactors).toHaveLength(1);
        expect(response.body.benchmarks.indigenous.revenueGrowth).toBe(19.7);
      });
    });

    describe('POST /api/v1/analytics/business/:businessId/predict-growth', () => {
      it('should predict business growth', async () => {
        const businessFeatures = {
          currentRevenue: 850000,
          employeeCount: 12,
          yearsInBusiness: 5,
          recentWinRate: 72.0,
          marketShare: 8.5,
          isIndigenous: true,
          certificationCount: 3,
          regionGrowthRate: 15.2,
        };

        const mockPrediction = {
          revenueGrowth: 18.5,
          employeeGrowth: 15.0,
          marketShareGrowth: 2.3,
          riskFactors: [
            'High competition in technology sector',
            'Dependence on government contracts',
          ],
          opportunities: [
            'Emerging green technology market',
            'Indigenous procurement initiatives',
            'Digital transformation projects',
          ],
        };

        jest.spyOn(MLService, 'predictBusinessGrowth')
          .mockResolvedValue(mockPrediction);

        const response = await request(app)
          .post(`/api/v1/analytics/business/${businessId}/predict-growth`)
          .set('Authorization', `Bearer ${businessToken}`)
          .send(businessFeatures);

        expect(response.status).toBe(200);
        expect(response.body.revenueGrowth).toBe(18.5);
        expect(response.body.employeeGrowth).toBe(15.0);
        expect(response.body.riskFactors).toHaveLength(2);
        expect(response.body.opportunities).toHaveLength(3);
      });
    });
  });

  describe('Predictive Analytics', () => {
    describe('POST /api/v1/analytics/ml/predict-indigenous-potential', () => {
      it('should predict Indigenous business potential', async () => {
        const businessData = {
          bandNumber: '123',
          region: 'Ontario',
          industry: 'Technology',
          currentCapacity: 75,
          certificationLevel: 'CCAB_CERTIFIED',
          communitySupport: 8.5,
          traditionalKnowledge: 7.2,
        };

        const mockPrediction = {
          growthPotential: 85.5,
          procurementOpportunities: [
            'Government IT services',
            'Indigenous-specific technology solutions',
            'Community development projects',
          ],
          supportRecommendations: [
            'Apply for Indigenous Innovation Fund',
            'Join CCAB procurement network',
            'Develop strategic partnerships with larger firms',
          ],
          culturalStrengths: [
            'Traditional knowledge integration',
            'Community-centered approach',
            'Authentic Indigenous perspective',
          ],
          capacityGaps: [
            'Large-scale project management',
            'Advanced technical certifications',
            'Marketing and business development',
          ],
        };

        jest.spyOn(MLService, 'predictIndigenousBusinessPotential')
          .mockResolvedValue(mockPrediction);

        const response = await request(app)
          .post('/api/v1/analytics/ml/predict-indigenous-potential')
          .set('Authorization', `Bearer ${businessToken}`)
          .send(businessData);

        expect(response.status).toBe(200);
        expect(response.body.growthPotential).toBe(85.5);
        expect(response.body.procurementOpportunities).toHaveLength(3);
        expect(response.body.supportRecommendations).toHaveLength(3);
        expect(response.body.culturalStrengths).toHaveLength(3);
        expect(response.body.capacityGaps).toHaveLength(3);
      });
    });

    describe('POST /api/v1/analytics/ml/detect-anomalies', () => {
      it('should detect anomalies in business metrics', async () => {
        const metricsData = {
          revenue: [100000, 105000, 110000, 108000, 95000], // Anomaly in last value
          winRate: [65, 68, 70, 72, 45], // Anomaly in last value
          responseTime: [3.2, 3.1, 2.9, 3.0, 2.8],
        };

        const mockAnomalies = {
          anomalies: [
            {
              metric: 'revenue',
              anomalyScore: 2.8,
              severity: 'medium' as const,
              explanation: 'Revenue value 95000.00 is 2.8 standard deviations from the mean (105600.00)',
              timestamp: new Date(),
            },
            {
              metric: 'winRate',
              anomalyScore: 3.2,
              severity: 'high' as const,
              explanation: 'Win rate value 45.00 is 3.2 standard deviations from the mean (65.00)',
              timestamp: new Date(),
            },
          ],
          overallHealthScore: 72,
        };

        jest.spyOn(MLService, 'detectAnomalies')
          .mockResolvedValue(mockAnomalies);

        const response = await request(app)
          .post(`/api/v1/analytics/ml/detect-anomalies`)
          .set('Authorization', `Bearer ${businessToken}`)
          .send({ businessId, metrics: metricsData });

        expect(response.status).toBe(200);
        expect(response.body.anomalies).toHaveLength(2);
        expect(response.body.anomalies[0].metric).toBe('revenue');
        expect(response.body.anomalies[1].severity).toBe('high');
        expect(response.body.overallHealthScore).toBe(72);
      });
    });
  });

  describe('Real-time Metrics', () => {
    describe('POST /api/v1/analytics/track-event', () => {
      it('should track real-time analytics event', async () => {
        const eventData = {
          type: 'rfq_response_submitted',
          businessId,
          rfqId,
          data: {
            responseTime: 2.5,
            bidAmount: 48000,
            isIndigenous: true,
          },
          timestamp: new Date(),
        };

        jest.spyOn(DataAggregatorService, 'processRealTimeEvent')
          .mockResolvedValue();

        const response = await request(app)
          .post('/api/v1/analytics/track-event')
          .set('Authorization', `Bearer ${businessToken}`)
          .send(eventData);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Event tracked successfully');
        expect(DataAggregatorService.processRealTimeEvent)
          .toHaveBeenCalledWith(eventData);
      });

      it('should validate event data', async () => {
        const response = await request(app)
          .post('/api/v1/analytics/track-event')
          .set('Authorization', `Bearer ${businessToken}`)
          .send({
            // Missing required fields
            type: 'rfq_response_submitted',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });
    });
  });

  describe('Data Quality', () => {
    describe('GET /api/v1/analytics/data-quality', () => {
      it('should return data quality metrics', async () => {
        const mockQualityMetrics = {
          completeness: 95.2,
          accuracy: 92.8,
          consistency: 88.5,
          timeliness: 94.1,
          issues: [
            {
              type: 'completeness' as const,
              severity: 'medium' as const,
              description: 'Missing business industry for 8 records',
              table: 'businesses',
              column: 'industry',
              count: 8,
              recommendation: 'Update business profiles to include industry classification',
            },
            {
              type: 'consistency' as const,
              severity: 'low' as const,
              description: 'Inconsistent date formats in 3 records',
              table: 'rfqs',
              column: 'deadline',
              count: 3,
              recommendation: 'Standardize date format validation',
            },
          ],
        };

        jest.spyOn(DataAggregatorService, 'executeDataQualityChecks')
          .mockResolvedValue(mockQualityMetrics);

        const response = await request(app)
          .get('/api/v1/analytics/data-quality')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.completeness).toBe(95.2);
        expect(response.body.accuracy).toBe(92.8);
        expect(response.body.issues).toHaveLength(2);
        expect(response.body.issues[0].type).toBe('completeness');
        expect(response.body.issues[1].severity).toBe('low');
      });

      it('should require admin role for data quality metrics', async () => {
        const response = await request(app)
          .get('/api/v1/analytics/data-quality')
          .set('Authorization', `Bearer ${businessToken}`);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      jest.spyOn(IndigenousAnalyticsService, 'getIndigenousAnalytics')
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/analytics/indigenous')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Database');
    });

    it('should handle authentication errors', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/indigenous')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limit
      const requests = Array(120).fill(null).map(() => 
        request(app)
          .get('/api/v1/analytics/indigenous')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large dataset analytics within time limits', async () => {
      const startTime = Date.now();

      // Mock large dataset response
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        period: `2024-${String(i % 12 + 1).padStart(2, '0')}`,
        value: Math.random() * 100000,
      }));

      jest.spyOn(IndigenousAnalyticsService, 'getIndigenousAnalytics')
        .mockResolvedValue({
          procurementTrends: largeDataset,
          totalIndigenousBusinesses: 1500,
          totalRFQsToIndigenous: 850,
          totalValueToIndigenous: 25000000,
          growthRate: 15.5,
        } as any);

      const response = await request(app)
        .get('/api/v1/analytics/indigenous')
        .set('Authorization', `Bearer ${adminToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      expect(response.body.procurementTrends).toHaveLength(1000);
    });

    it('should cache frequently requested analytics', async () => {
      jest.spyOn(IndigenousAnalyticsService, 'getIndigenousAnalytics')
        .mockResolvedValue({
          totalIndigenousBusinesses: 150,
          totalRFQsToIndigenous: 89,
        } as any);

      // First request
      const response1 = await request(app)
        .get('/api/v1/analytics/indigenous')
        .set('Authorization', `Bearer ${adminToken}`);

      // Second request (should use cache)
      const response2 = await request(app)
        .get('/api/v1/analytics/indigenous')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body).toEqual(response2.body);
      
      // Service should only be called once due to caching
      expect(IndigenousAnalyticsService.getIndigenousAnalytics).toHaveBeenCalledTimes(1);
    });
  });
});