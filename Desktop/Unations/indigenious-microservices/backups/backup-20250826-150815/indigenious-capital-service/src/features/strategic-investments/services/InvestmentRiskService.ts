/**
 * Investment Risk Management Service
 * Sophisticated risk assessment leveraging platform intelligence
 * Protects capital while maximizing returns
 */

import prisma from '@/lib/prisma';
import { PredictionService } from '@/features/predictive-analytics/services/PredictionService';
import { AINetworkOrchestrator } from '@/features/admin/network-health/services/ai-network-orchestrator';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import type { InvestmentOpportunity, InvestmentDecision } from '../types';

interface RiskAssessment {
  overallScore: number; // 0-1 (lower is better)
  category: 'low' | 'medium' | 'high' | 'extreme';
  
  factors: {
    market: RiskFactor;
    execution: RiskFactor;
    regulatory: RiskFactor;
    political: RiskFactor;
    liquidity: RiskFactor;
    concentration: RiskFactor;
  };
  
  scenarios: {
    bestCase: ScenarioAnalysis;
    baseCase: ScenarioAnalysis;
    worstCase: ScenarioAnalysis;
  };
  
  mitigations: Array<{
    risk: string;
    mitigation: string;
    effectiveness: number; // 0-1
    cost: number;
  }>;
  
  recommendation: {
    proceed: boolean;
    adjustedAmount?: number; // If different from requested
    conditions: string[];
    monitoring: string[];
  };
}

interface RiskFactor {
  score: number; // 0-1
  weight: number; // Importance
  description: string;
  dataPoints: Array<{
    source: string;
    signal: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}

interface ScenarioAnalysis {
  probability: number;
  returnMultiple: number;
  timeToExit: number; // months
  keyAssumptions: string[];
}

interface PortfolioRisk {
  totalRisk: number;
  diversificationScore: number;
  concentrationRisks: Array<{
    type: string;
    exposure: number;
    limit: number;
    action: 'reduce' | 'monitor' | 'acceptable';
  }>;
  correlationMatrix: Record<string, Record<string, number>>;
  stressTests: Array<{
    scenario: string;
    portfolioImpact: number; // % loss
    probabilty: number;
  }>;
}

export class InvestmentRiskService {
  private static instance: InvestmentRiskService;
  private predictionService = new PredictionService();
  private aiOrchestrator = AINetworkOrchestrator.getInstance();
  
  // Risk thresholds
  private static readonly MAX_POSITION_SIZE = 0.15; // 15% of portfolio
  private static readonly MAX_SECTOR_EXPOSURE = 0.40; // 40% in one sector
  private static readonly MIN_LIQUIDITY_SCORE = 0.3;
  private static readonly MAX_ACCEPTABLE_RISK = 0.7;
  
  private constructor() {}
  
  static getInstance(): InvestmentRiskService {
    if (!this.instance) {
      this.instance = new InvestmentRiskService();
    }
    return this.instance;
  }
  
  /**
   * Comprehensive risk assessment for investment opportunity
   */
  async assessInvestmentRisk(
    opportunity: InvestmentOpportunity,
    requestedAmount: number,
    portfolio: any
  ): Promise<RiskAssessment> {
    // Gather intelligence from all platform sources
    const intelligence = await this.gatherRiskIntelligence(opportunity);
    
    // Assess individual risk factors
    const factors = {
      market: await this.assessMarketRisk(opportunity, intelligence),
      execution: await this.assessExecutionRisk(opportunity, intelligence),
      regulatory: await this.assessRegulatoryRisk(opportunity, intelligence),
      political: await this.assessPoliticalRisk(opportunity, intelligence),
      liquidity: await this.assessLiquidityRisk(opportunity, intelligence),
      concentration: await this.assessConcentrationRisk(opportunity, requestedAmount, portfolio)
    };
    
    // Calculate weighted overall score
    const overallScore = this.calculateWeightedRiskScore(factors);
    
    // Run scenario analysis
    const scenarios = await this.runScenarioAnalysis(opportunity, factors);
    
    // Identify mitigations
    const mitigations = this.identifyMitigations(factors, opportunity);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(
      overallScore,
      factors,
      scenarios,
      requestedAmount,
      portfolio
    );
    
    const assessment: RiskAssessment = {
      overallScore,
      category: this.categorizeRisk(overallScore),
      factors,
      scenarios,
      mitigations,
      recommendation
    };
    
    // Log assessment
    await indigenousLedger.log(
      'investment.risk.assessed',
      'info',
      'Investment risk assessment completed',
      {
        opportunityId: opportunity.id,
        riskScore: overallScore,
        recommendation: recommendation.proceed ? 'proceed' : 'reject'
      }
    );
    
    return assessment;
  }
  
  /**
   * Portfolio-level risk analysis
   */
  async analyzePortfolioRisk(portfolio: unknown): Promise<PortfolioRisk> {
    // Calculate concentration by various dimensions
    const concentrationRisks = this.analyzeConcentrations(portfolio);
    
    // Build correlation matrix
    const correlationMatrix = await this.buildCorrelationMatrix(portfolio.positions);
    
    // Run stress tests
    const stressTests = await this.runStressTests(portfolio);
    
    // Calculate diversification score
    const diversificationScore = this.calculateDiversification(
      portfolio,
      correlationMatrix
    );
    
    // Overall portfolio risk
    const totalRisk = this.calculatePortfolioRisk(
      portfolio,
      correlationMatrix,
      concentrationRisks
    );
    
    return {
      totalRisk,
      diversificationScore,
      concentrationRisks,
      correlationMatrix,
      stressTests
    };
  }
  
  /**
   * Real-time risk monitoring
   */
  async monitorActiveRisks(): Promise<Array<{
    investmentId: string;
    alertType: 'warning' | 'critical';
    risk: string;
    description: string;
    suggestedAction: string;
  }>> {
    const alerts = [];
    
    // Get all active investments
    const activeInvestments = await prisma.strategicInvestment.findMany({
      where: { status: 'active' }
    });
    
    for (const investment of activeInvestments) {
      // Check for risk triggers
      const risks = await this.checkRiskTriggers(investment);
      
      for (const risk of risks) {
        alerts.push({
          investmentId: investment.id,
          alertType: risk.severity as 'warning' | 'critical',
          risk: risk.type,
          description: risk.description,
          suggestedAction: risk.action
        });
      }
    }
    
    // Log critical alerts
    const criticalAlerts = alerts.filter(a => a.alertType === 'critical');
    if (criticalAlerts.length > 0) {
      await indigenousLedger.log(
        'investment.risk.alert',
        'warning',
        'Critical investment risks detected',
        {
          count: criticalAlerts.length,
          investments: criticalAlerts.map(a => a.investmentId)
        }
      );
    }
    
    return alerts;
  }
  
  /**
   * Risk-adjusted position sizing
   */
  calculateOptimalPosition(
    opportunity: InvestmentOpportunity,
    riskAssessment: RiskAssessment,
    portfolio: any
  ): {
    recommendedAmount: number;
    maxAmount: number;
    reasoning: string[];
  } {
    const availableCapital = portfolio.cashAvailable;
    const currentPortfolioValue = portfolio.totalValue;
    
    // Kelly Criterion adjusted for our risk tolerance
    const kellyFraction = this.calculateKellyFraction(
      opportunity,
      riskAssessment
    );
    
    // Apply constraints
    let recommendedAmount = availableCapital * kellyFraction;
    
    // Max position size constraint
    const maxPositionSize = currentPortfolioValue * this.MAX_POSITION_SIZE;
    recommendedAmount = Math.min(recommendedAmount, maxPositionSize);
    
    // Minimum investment constraint
    recommendedAmount = Math.max(recommendedAmount, opportunity.financials.minimumInvestment);
    
    // Risk-based adjustment
    if (riskAssessment.overallScore > 0.5) {
      recommendedAmount *= (1 - riskAssessment.overallScore);
    }
    
    const reasoning = [];
    
    if (kellyFraction < 0.1) {
      reasoning.push('Low conviction due to risk/reward profile');
    }
    if (recommendedAmount < maxPositionSize) {
      reasoning.push('Position sized based on Kelly Criterion');
    } else {
      reasoning.push('Position limited by concentration rules');
    }
    if (riskAssessment.overallScore > 0.5) {
      reasoning.push('Amount reduced due to elevated risk');
    }
    
    return {
      recommendedAmount: Math.floor(recommendedAmount),
      maxAmount: Math.floor(maxPositionSize),
      reasoning
    };
  }
  
  /**
   * Private methods
   */
  private async gatherRiskIntelligence(opportunity: InvestmentOpportunity): Promise<unknown> {
    // Aggregate all available intelligence
    const [
      marketData,
      competitorAnalysis,
      regulatoryChanges,
      communitysentiment
    ] = await Promise.all([
      this.getMarketIntelligence(opportunity),
      this.analyzeCompetitors(opportunity),
      this.checkRegulatoryChanges(opportunity),
      this.assessCommunitySentiment(opportunity)
    ]);
    
    return {
      marketData,
      competitorAnalysis,
      regulatoryChanges,
      communitysentiment
    };
  }
  
  private async assessMarketRisk(
    opportunity: InvestmentOpportunity,
    intelligence: any
  ): Promise<RiskFactor> {
    const dataPoints = [];
    let score = 0.3; // Base market risk
    
    // Market volatility
    if (intelligence.marketData.volatility > 0.3) {
      score += 0.2;
      dataPoints.push({
        source: 'Market Analysis',
        signal: 'High volatility in sector',
        impact: 'negative' as const
      });
    }
    
    // Competitive landscape
    if (intelligence.competitorAnalysis.competitorCount > 5) {
      score += 0.1;
      dataPoints.push({
        source: 'Competitor Analysis',
        signal: `${intelligence.competitorAnalysis.competitorCount} active competitors`,
        impact: 'negative' as const
      });
    }
    
    // Our intelligence advantage
    if (opportunity.intelligenceSource.timeHorizon > 6) {
      score -= 0.2;
      dataPoints.push({
        source: 'Platform Intelligence',
        signal: `${opportunity.intelligenceSource.timeHorizon} month information advantage`,
        impact: 'positive' as const
      });
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      weight: 0.25,
      description: 'Market dynamics and competitive landscape',
      dataPoints
    };
  }
  
  private async assessExecutionRisk(
    opportunity: InvestmentOpportunity,
    intelligence: any
  ): Promise<RiskFactor> {
    const dataPoints = [];
    let score = 0.2; // Base execution risk
    
    // Management track record (if equity investment)
    if (opportunity.target.type === 'equity') {
      const trackRecord = await this.getManagementTrackRecord(opportunity.target.name);
      if (trackRecord.failureRate > 0.2) {
        score += 0.3;
        dataPoints.push({
          source: 'Management Analysis',
          signal: 'Higher than average failure rate',
          impact: 'negative' as const
        });
      }
    }
    
    // Project complexity
    if (opportunity.thesis.catalysts.length > 3) {
      score += 0.1;
      dataPoints.push({
        source: 'Complexity Analysis',
        signal: 'Multiple catalysts required for success',
        impact: 'negative' as const
      });
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      weight: 0.25,
      description: 'Ability to execute on investment thesis',
      dataPoints
    };
  }
  
  private async assessRegulatoryRisk(
    opportunity: InvestmentOpportunity,
    intelligence: any
  ): Promise<RiskFactor> {
    const dataPoints = [];
    let score = 0.1; // Base regulatory risk
    
    // Check for pending regulatory changes
    if (intelligence.regulatoryChanges.pending > 0) {
      score += 0.3;
      dataPoints.push({
        source: 'Regulatory Monitor',
        signal: `${intelligence.regulatoryChanges.pending} pending regulatory changes`,
        impact: 'negative' as const
      });
    }
    
    // Indigenous project protections
    if (opportunity.structure.indigenousParticipation && opportunity.structure.indigenousParticipation > 50) {
      score -= 0.1;
      dataPoints.push({
        source: 'Legal Analysis',
        signal: 'Protected under Indigenous business provisions',
        impact: 'positive' as const
      });
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      weight: 0.15,
      description: 'Regulatory and compliance risks',
      dataPoints
    };
  }
  
  private async assessPoliticalRisk(
    opportunity: InvestmentOpportunity,
    intelligence: any
  ): Promise<RiskFactor> {
    const dataPoints = [];
    let score = 0.2; // Base political risk
    
    // Community support
    if (intelligence.communitysentiment.support < 0.5) {
      score += 0.3;
      dataPoints.push({
        source: 'Community Analysis',
        signal: 'Low community support',
        impact: 'negative' as const
      });
    } else if (intelligence.communitysentiment.support > 0.8) {
      score -= 0.1;
      dataPoints.push({
        source: 'Community Analysis',
        signal: 'Strong community backing',
        impact: 'positive' as const
      });
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      weight: 0.15,
      description: 'Political and social acceptance risks',
      dataPoints
    };
  }
  
  private async assessLiquidityRisk(
    opportunity: InvestmentOpportunity,
    intelligence: any
  ): Promise<RiskFactor> {
    const dataPoints = [];
    let score = 0.5; // Base liquidity risk for private investments
    
    // Public market investments
    if (opportunity.target.type === 'equity' && intelligence.marketData.isPublic) {
      score = 0.1;
      dataPoints.push({
        source: 'Market Data',
        signal: 'Publicly traded with daily liquidity',
        impact: 'positive' as const
      });
    }
    
    // Exit strategy clarity
    if (opportunity.thesis.exitStrategy.includes('IPO') || 
        opportunity.thesis.exitStrategy.includes('acquisition')) {
      score -= 0.1;
      dataPoints.push({
        source: 'Exit Analysis',
        signal: 'Clear exit path identified',
        impact: 'positive' as const
      });
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      weight: 0.1,
      description: 'Ability to exit position when needed',
      dataPoints
    };
  }
  
  private async assessConcentrationRisk(
    opportunity: InvestmentOpportunity,
    amount: number,
    portfolio: any
  ): Promise<RiskFactor> {
    const dataPoints = [];
    const totalPortfolioValue = portfolio.totalValue + amount;
    const positionSize = amount / totalPortfolioValue;
    
    let score = 0;
    
    // Position size concentration
    if (positionSize > 0.15) {
      score += 0.5;
      dataPoints.push({
        source: 'Portfolio Analysis',
        signal: `Position would be ${(positionSize * 100).toFixed(1)}% of portfolio`,
        impact: 'negative' as const
      });
    }
    
    // Sector concentration
    const sectorExposure = this.calculateSectorExposure(portfolio, opportunity);
    if (sectorExposure > 0.4) {
      score += 0.3;
      dataPoints.push({
        source: 'Sector Analysis',
        signal: `Sector exposure would reach ${(sectorExposure * 100).toFixed(1)}%`,
        impact: 'negative' as const
      });
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      weight: 0.1,
      description: 'Portfolio concentration risk',
      dataPoints
    };
  }
  
  private calculateWeightedRiskScore(factors: RiskAssessment['factors']): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const factor of Object.values(factors)) {
      totalScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    }
    
    return totalScore / totalWeight;
  }
  
  private categorizeRisk(score: number): RiskAssessment['category'] {
    if (score < 0.25) return 'low';
    if (score < 0.5) return 'medium';
    if (score < 0.75) return 'high';
    return 'extreme';
  }
  
  private async runScenarioAnalysis(
    opportunity: InvestmentOpportunity,
    factors: RiskAssessment['factors']
  ): Promise<RiskAssessment['scenarios']> {
    // Best case - everything goes right
    const bestCase: ScenarioAnalysis = {
      probability: 0.2,
      returnMultiple: opportunity.target.returnMultiple * 1.5,
      timeToExit: opportunity.timing.holdPeriod * 0.7,
      keyAssumptions: [
        'All catalysts occur on schedule',
        'No regulatory obstacles',
        'Market conditions remain favorable'
      ]
    };
    
    // Base case - expected outcome
    const baseCase: ScenarioAnalysis = {
      probability: 0.6,
      returnMultiple: opportunity.target.returnMultiple,
      timeToExit: opportunity.timing.holdPeriod,
      keyAssumptions: [
        'Primary catalyst occurs',
        'Normal market conditions',
        'Execution as planned'
      ]
    };
    
    // Worst case - risk factors materialize
    const worstCase: ScenarioAnalysis = {
      probability: 0.2,
      returnMultiple: 0.5, // 50% loss
      timeToExit: opportunity.timing.holdPeriod * 2,
      keyAssumptions: [
        'Key risks materialize',
        'Market downturn',
        'Execution failures'
      ]
    };
    
    return { bestCase, baseCase, worstCase };
  }
  
  private identifyMitigations(
    factors: RiskAssessment['factors'],
    opportunity: InvestmentOpportunity
  ): RiskAssessment['mitigations'] {
    const mitigations = [];
    
    // High market risk mitigation
    if (factors.market.score > 0.5) {
      mitigations.push({
        risk: 'Market volatility',
        mitigation: 'Hedge with options or inverse positions',
        effectiveness: 0.7,
        cost: opportunity.financials.minimumInvestment * 0.02
      });
    }
    
    // Execution risk mitigation
    if (factors.execution.score > 0.5) {
      mitigations.push({
        risk: 'Execution failure',
        mitigation: 'Board seat or advisory role',
        effectiveness: 0.6,
        cost: 0
      });
    }
    
    // Liquidity risk mitigation
    if (factors.liquidity.score > 0.5) {
      mitigations.push({
        risk: 'Illiquidity',
        mitigation: 'Negotiate put option or buyback clause',
        effectiveness: 0.8,
        cost: opportunity.financials.minimumInvestment * 0.05
      });
    }
    
    return mitigations;
  }
  
  private generateRecommendation(
    overallScore: number,
    factors: RiskAssessment['factors'],
    scenarios: RiskAssessment['scenarios'],
    requestedAmount: number,
    portfolio: any
  ): RiskAssessment['recommendation'] {
    const expectedReturn = 
      scenarios.bestCase.returnMultiple * scenarios.bestCase.probability +
      scenarios.baseCase.returnMultiple * scenarios.baseCase.probability +
      scenarios.worstCase.returnMultiple * scenarios.worstCase.probability;
    
    // Risk-adjusted return threshold
    const requiredReturn = 1 + (overallScore * 5); // Higher risk needs higher return
    
    const proceed = 
      overallScore < this.MAX_ACCEPTABLE_RISK &&
      expectedReturn >= requiredReturn &&
      factors.concentration.score < 0.7;
    
    const conditions = [];
    const monitoring = [];
    
    if (factors.execution.score > 0.5) {
      conditions.push('Secure board observer rights');
      monitoring.push('Monthly execution updates');
    }
    
    if (factors.regulatory.score > 0.3) {
      conditions.push('Legal opinion on regulatory risks');
      monitoring.push('Regulatory change alerts');
    }
    
    if (factors.liquidity.score > 0.5) {
      conditions.push('Negotiate exit provisions');
    }
    
    // Adjust amount for risk
    let adjustedAmount = requestedAmount;
    if (overallScore > 0.5) {
      adjustedAmount = requestedAmount * (1 - overallScore + 0.5);
    }
    
    return {
      proceed,
      adjustedAmount: proceed ? adjustedAmount : undefined,
      conditions,
      monitoring
    };
  }
  
  // Helper methods
  private async getMarketIntelligence(opportunity: InvestmentOpportunity): Promise<unknown> {
    return {
      volatility: 0.25,
      trend: 'upward',
      isPublic: opportunity.target.type === 'equity'
    };
  }
  
  private async analyzeCompetitors(opportunity: InvestmentOpportunity): Promise<unknown> {
    return {
      competitorCount: 3,
      marketShare: 0.15
    };
  }
  
  private async checkRegulatoryChanges(opportunity: InvestmentOpportunity): Promise<unknown> {
    return {
      pending: 0,
      timeline: 'none'
    };
  }
  
  private async assessCommunitySentiment(opportunity: InvestmentOpportunity): Promise<unknown> {
    return {
      support: 0.75,
      opposition: 0.1
    };
  }
  
  private async getManagementTrackRecord(companyName: string): Promise<unknown> {
    return {
      successRate: 0.7,
      failureRate: 0.3
    };
  }
  
  private calculateSectorExposure(portfolio: any, opportunity: InvestmentOpportunity): number {
    // Calculate current sector exposure
    return 0.25; // Placeholder
  }
  
  private calculateKellyFraction(
    opportunity: InvestmentOpportunity,
    riskAssessment: RiskAssessment
  ): number {
    const winProbability = 1 - riskAssessment.overallScore;
    const winReturn = opportunity.target.returnMultiple - 1;
    const lossReturn = 0.5; // Assume 50% loss in worst case
    
    // Kelly formula: f = (p * b - q) / b
    // where p = win probability, q = loss probability, b = win/loss ratio
    const b = winReturn / lossReturn;
    const f = (winProbability * b - (1 - winProbability)) / b;
    
    // Apply Kelly fraction divisor for safety (usually 4-10)
    return Math.max(0, Math.min(0.25, f / 6));
  }
  
  private analyzeConcentrations(portfolio: unknown): PortfolioRisk['concentrationRisks'] {
    return []; // Placeholder
  }
  
  private async buildCorrelationMatrix(positions: unknown[]): Promise<Record<string, Record<string, number>>> {
    return {}; // Placeholder
  }
  
  private async runStressTests(portfolio: unknown): Promise<PortfolioRisk['stressTests']> {
    return [
      {
        scenario: 'Market crash (-30%)',
        portfolioImpact: -0.25,
        probabilty: 0.1
      },
      {
        scenario: 'Regulatory crackdown',
        portfolioImpact: -0.15,
        probabilty: 0.05
      }
    ];
  }
  
  private calculateDiversification(portfolio: any, correlations: any): number {
    return 0.75; // Placeholder
  }
  
  private calculatePortfolioRisk(portfolio: any, correlations: any, concentrations: any): number {
    return 0.4; // Placeholder
  }
  
  private async checkRiskTriggers(investment: unknown): Promise<any[]> {
    return []; // Placeholder
  }
}

export default InvestmentRiskService;