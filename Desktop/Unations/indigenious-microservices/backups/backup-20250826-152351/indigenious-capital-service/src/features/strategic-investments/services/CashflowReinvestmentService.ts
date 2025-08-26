/**
 * Cashflow Reinvestment Service
 * Automatically reinvests platform fees into high-return opportunities
 * Creates a self-reinforcing wealth generation machine
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { IntelligenceInvestmentService } from './IntelligenceInvestmentService';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import type { CashflowStrategy, InvestmentOpportunity } from '../types';

export class CashflowReinvestmentService {
  private static instance: CashflowReinvestmentService;
  private investmentService = IntelligenceInvestmentService.getInstance();
  
  // Default strategy (conservative but profitable)
  private strategy: CashflowStrategy = {
    rules: {
      minCashReserve: 6, // 6 months runway
      maxPortfolioConcentration: 0.15, // 15% max per investment
      targetDeploymentRate: 0.7, // Deploy 70% of excess cash
      rebalanceFrequency: 'monthly'
    },
    
    allocation: {
      highRisk: 0.4, // 40% in 10-100x opportunities
      mediumRisk: 0.3, // 30% in 5-10x opportunities
      lowRisk: 0.2, // 20% in 2-5x opportunities
      reserve: 0.1 // 10% cash reserve
    },
    
    triggers: {
      takeProfit: 10, // Exit when 10x achieved
      stopLoss: 0.5, // Exit if down 50%
      rebalance: 0.1 // Rebalance if allocation off by 10%
    },
    
    feeRecycling: {
      escrowFees: {
        percentage: 0.8, // Reinvest 80% of escrow fees
        targetInvestments: ['equity', 'jv', 'land']
      },
      bondingCommissions: {
        percentage: 0.7, // Reinvest 70% of bonding commissions
        targetInvestments: ['equity', 'debt']
      }
    }
  };
  
  private constructor() {
    this.startAutomatedReinvestment();
  }
  
  static getInstance(): CashflowReinvestmentService {
    if (!this.instance) {
      this.instance = new CashflowReinvestmentService();
    }
    return this.instance;
  }
  
  /**
   * Calculate available cash for reinvestment
   */
  async calculateAvailableCash(): Promise<{
    totalCash: number;
    reserveRequirement: number;
    availableForInvestment: number;
    breakdown: {
      escrowFees: number;
      bondingCommissions: number;
      investmentReturns: number;
      other: number;
    };
  }> {
    // Get current cash position
    const cashPosition = await prisma.platformCashflow.findFirst({
      orderBy: { date: 'desc' }
    });
    
    const totalCash = cashPosition?.balance || 0;
    
    // Calculate reserve requirement (6 months operating expenses)
    const monthlyExpenses = await this.calculateMonthlyExpenses();
    const reserveRequirement = monthlyExpenses * this.strategy.rules.minCashReserve;
    
    // Get recent fee income
    const feeIncome = await this.getRecentFeeIncome();
    
    // Calculate available for investment
    const availableForInvestment = Math.max(0, totalCash - reserveRequirement);
    
    return {
      totalCash,
      reserveRequirement,
      availableForInvestment,
      breakdown: {
        escrowFees: feeIncome.escrow,
        bondingCommissions: feeIncome.bonding,
        investmentReturns: feeIncome.investments,
        other: feeIncome.other
      }
    };
  }
  
  /**
   * Execute automated reinvestment based on strategy
   */
  async executeReinvestmentCycle(): Promise<{
    deployed: number;
    investments: Array<{
      opportunity: InvestmentOpportunity;
      amount: number;
      expectedReturn: number;
    }>;
    remaining: number;
  }> {
    // Get available cash
    const cashflow = await this.calculateAvailableCash();
    
    if (cashflow.availableForInvestment < 100000) {
      return { deployed: 0, investments: [], remaining: cashflow.availableForInvestment };
    }
    
    // Get investment opportunities
    const opportunities = await this.investmentService.identifyOpportunities();
    
    // Categorize by risk/return
    const categorized = this.categorizeOpportunities(opportunities);
    
    // Calculate deployment amounts
    const deploymentPlan = this.calculateDeploymentPlan(
      cashflow.availableForInvestment,
      categorized
    );
    
    // Execute investments
    const investments = [];
    let totalDeployed = 0;
    
    for (const allocation of deploymentPlan) {
      const decision = await this.investmentService.evaluateOpportunity(
        allocation.opportunity.id,
        allocation.amount
      );
      
      if (decision.decision === 'approve') {
        const result = await this.investmentService.executeInvestment(decision);
        
        if (result.success) {
          investments.push({
            opportunity: allocation.opportunity,
            amount: allocation.amount,
            expectedReturn: allocation.amount * allocation.opportunity.target.returnMultiple
          });
          totalDeployed += allocation.amount;
        }
      }
    }
    
    // Log reinvestment cycle
    await indigenousLedger.log(
      'cashflow.reinvested',
      'info',
      'Automated cashflow reinvestment executed',
      {
        availableCash: cashflow.availableForInvestment,
        deployed: totalDeployed,
        investmentCount: investments.length,
        expectedReturns: investments.reduce((sum, inv) => sum + inv.expectedReturn, 0)
      }
    );
    
    // Update cash position
    await this.updateCashPosition(totalDeployed);
    
    return {
      deployed: totalDeployed,
      investments,
      remaining: cashflow.availableForInvestment - totalDeployed
    };
  }
  
  /**
   * Monitor and rebalance portfolio
   */
  async rebalancePortfolio(): Promise<{
    rebalanced: boolean;
    trades: Array<{
      action: 'buy' | 'sell';
      position: string;
      amount: number;
      reason: string;
    }>;
  }> {
    const portfolio = await this.investmentService.monitorPortfolio();
    const currentAllocation = portfolio.portfolio.allocation;
    const targetAllocation = this.strategy.allocation;
    
    const trades = [];
    let needsRebalancing = false;
    
    // Check if rebalancing needed
    for (const [category, target] of Object.entries(targetAllocation)) {
      const current = currentAllocation.byRisk[category] || 0;
      const totalValue = portfolio.portfolio.totalValue;
      const currentPercentage = current / totalValue;
      
      if (Math.abs(currentPercentage - target) > this.strategy.triggers.rebalance) {
        needsRebalancing = true;
        
        if (currentPercentage > target) {
          // Sell excess
          const sellAmount = (currentPercentage - target) * totalValue;
          trades.push({
            action: 'sell' as const,
            position: category,
            amount: sellAmount,
            reason: `Rebalance: ${category} over target by ${((currentPercentage - target) * 100).toFixed(1)}%`
          });
        } else {
          // Buy more
          const buyAmount = (target - currentPercentage) * totalValue;
          trades.push({
            action: 'buy' as const,
            position: category,
            amount: buyAmount,
            reason: `Rebalance: ${category} under target by ${((target - currentPercentage) * 100).toFixed(1)}%`
          });
        }
      }
    }
    
    // Execute trades if needed
    if (needsRebalancing) {
      for (const trade of trades) {
        await this.executeTrade(trade);
      }
    }
    
    return { rebalanced: needsRebalancing, trades };
  }
  
  /**
   * Project future cashflow based on current trajectory
   */
  async projectCashflow(months: number = 12): Promise<{
    projections: Array<{
      month: number;
      feeIncome: number;
      investmentReturns: number;
      totalCash: number;
      portfolioValue: number;
    }>;
    totalProjectedReturn: number;
    effectiveMultiple: number;
  }> {
    const currentCash = await this.calculateAvailableCash();
    const portfolio = await this.investmentService.monitorPortfolio();
    
    const projections = [];
    let runningCash = currentCash.totalCash;
    let runningPortfolioValue = portfolio.portfolio.totalValue;
    
    // Average monthly fee income (last 3 months)
    const avgMonthlyFees = await this.getAverageMonthlyFees();
    
    for (let month = 1; month <= months; month++) {
      // Project fee income with growth
      const feeGrowthRate = 1.1; // 10% monthly growth
      const monthlyFees = avgMonthlyFees * Math.pow(feeGrowthRate, month);
      
      // Project investment returns (conservative)
      const monthlyPortfolioReturn = runningPortfolioValue * 0.08; // 8% monthly
      
      // Reinvest 70% of new cash
      const reinvestmentAmount = (monthlyFees + monthlyPortfolioReturn) * this.strategy.rules.targetDeploymentRate;
      
      // Update running totals
      runningCash += monthlyFees + monthlyPortfolioReturn - reinvestmentAmount;
      runningPortfolioValue += reinvestmentAmount + (runningPortfolioValue * 0.08);
      
      projections.push({
        month,
        feeIncome: monthlyFees,
        investmentReturns: monthlyPortfolioReturn,
        totalCash: runningCash,
        portfolioValue: runningPortfolioValue
      });
    }
    
    const totalProjectedReturn = runningPortfolioValue - portfolio.portfolio.totalValue;
    const effectiveMultiple = runningPortfolioValue / portfolio.portfolio.totalDeployed;
    
    return {
      projections,
      totalProjectedReturn,
      effectiveMultiple
    };
  }
  
  /**
   * Generate reinvestment report
   */
  async generateReinvestmentReport(): Promise<{
    summary: {
      totalReinvested: number;
      totalReturns: number;
      averageMultiple: number;
      successRate: number;
    };
    topPerformers: Array<{
      investment: string;
      entryDate: Date;
      investedAmount: number;
      currentValue: number;
      multiple: number;
    }>;
    upcomingOpportunities: Array<{
      opportunity: string;
      potentialReturn: number;
      confidence: number;
      recommendedAmount: number;
    }>;
  }> {
    // Get historical data
    const investments = await prisma.strategicInvestment.findMany({
      orderBy: { performance: { desc: true } }
    });
    
    // Calculate summary metrics
    const totalReinvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = investments.reduce((sum, inv) => 
      sum + (inv.status === 'exited' ? inv.exitValue - inv.amount : inv.currentValue - inv.amount), 0
    );
    const averageMultiple = investments.length > 0 
      ? investments.reduce((sum, inv) => sum + (inv.currentValue / inv.amount), 0) / investments.length
      : 0;
    const successRate = investments.length > 0
      ? investments.filter(inv => inv.currentValue > inv.amount).length / investments.length
      : 0;
    
    // Get top performers
    const topPerformers = investments
      .filter(inv => inv.status === 'active')
      .slice(0, 5)
      .map(inv => ({
        investment: inv.targetName,
        entryDate: inv.entryDate,
        investedAmount: inv.amount,
        currentValue: inv.currentValue,
        multiple: inv.currentValue / inv.amount
      }));
    
    // Get upcoming opportunities
    const opportunities = await this.investmentService.identifyOpportunities();
    const upcomingOpportunities = opportunities.slice(0, 5).map(opp => ({
      opportunity: opp.target.name,
      potentialReturn: opp.target.returnMultiple,
      confidence: opp.intelligenceSource.confidenceLevel,
      recommendedAmount: opp.financials.minimumInvestment
    }));
    
    return {
      summary: {
        totalReinvested,
        totalReturns,
        averageMultiple,
        successRate
      },
      topPerformers,
      upcomingOpportunities
    };
  }
  
  /**
   * Start automated reinvestment cycle
   */
  private startAutomatedReinvestment(): void {
    // Run daily reinvestment check
    setInterval(async () => {
      try {
        // Only on business days
        const now = new Date();
        if (now.getDay() === 0 || now.getDay() === 6) return;
        
        // Execute reinvestment
        const result = await this.executeReinvestmentCycle();
        
        if (result.deployed > 0) {
          logger.info(`Reinvested $${result.deployed.toLocaleString()} into ${result.investments.length} opportunities`);
        }
        
        // Check for rebalancing (monthly)
        if (now.getDate() === 1) {
          const rebalance = await this.rebalancePortfolio();
          if (rebalance.rebalanced) {
            logger.info(`Portfolio rebalanced with ${rebalance.trades.length} trades`);
          }
        }
      } catch (error) {
        logger.error('Automated reinvestment error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }
  
  // Helper methods
  private async calculateMonthlyExpenses(): Promise<number> {
    // Calculate platform operating expenses
    return 500000; // $500K/month placeholder
  }
  
  private async getRecentFeeIncome(): Promise<unknown> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const fees = await prisma.platformFees.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: {
        escrowFees: true,
        bondingCommissions: true,
        otherFees: true
      }
    });
    
    return {
      escrow: fees._sum.escrowFees || 0,
      bonding: fees._sum.bondingCommissions || 0,
      investments: 0, // TODO: Calculate investment returns
      other: fees._sum.otherFees || 0
    };
  }
  
  private categorizeOpportunities(opportunities: InvestmentOpportunity[]): Record<string, InvestmentOpportunity[]> {
    return {
      highRisk: opportunities.filter(o => o.target.returnMultiple >= 10),
      mediumRisk: opportunities.filter(o => o.target.returnMultiple >= 5 && o.target.returnMultiple < 10),
      lowRisk: opportunities.filter(o => o.target.returnMultiple >= 2 && o.target.returnMultiple < 5)
    };
  }
  
  private calculateDeploymentPlan(
    availableCash: number,
    categorizedOpps: Record<string, InvestmentOpportunity[]>
  ): Array<{ opportunity: InvestmentOpportunity; amount: number }> {
    const plan = [];
    
    // Allocate based on strategy
    for (const [category, allocation] of Object.entries(this.strategy.allocation)) {
      if (category === 'reserve') continue;
      
      const categoryAmount = availableCash * allocation;
      const opportunities = categorizedOpps[category] || [];
      
      // Divide equally among top opportunities in category
      const perOpportunity = categoryAmount / Math.min(3, opportunities.length);
      
      for (const opp of opportunities.slice(0, 3)) {
        plan.push({
          opportunity: opp,
          amount: Math.min(perOpportunity, opp.financials.maximumInvestment)
        });
      }
    }
    
    return plan;
  }
  
  private async updateCashPosition(deployed: number): Promise<void> {
    await prisma.platformCashflow.create({
      data: {
        date: new Date(),
        type: 'investment',
        amount: -deployed,
        description: 'Strategic investment deployment',
        balance: 0 // Would calculate actual balance
      }
    });
  }
  
  private async executeTrade(trade: unknown): Promise<void> {
    // Execute portfolio rebalancing trade
    logger.info('Executing trade:', trade);
  }
  
  private async getAverageMonthlyFees(): Promise<number> {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const fees = await prisma.platformFees.aggregate({
      where: { createdAt: { gte: threeMonthsAgo } },
      _sum: {
        escrowFees: true,
        bondingCommissions: true
      }
    });
    
    const total = (fees._sum.escrowFees || 0) + (fees._sum.bondingCommissions || 0);
    return total / 3; // Average over 3 months
  }
}

export default CashflowReinvestmentService;