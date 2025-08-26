import { logger } from '@/lib/monitoring/logger';

/**
 * Strategic Investments Module
 * Converts platform intelligence into 10-100x returns through automated reinvestment
 */

// Services
export { IntelligenceInvestmentService } from './services/IntelligenceInvestmentService'
export { CashflowReinvestmentService } from './services/CashflowReinvestmentService'
export { LegalStructureService } from './services/LegalStructureService'
export { InvestmentRiskService } from './services/InvestmentRiskService'

// Components
export { InvestmentDashboard } from './components/InvestmentDashboard'

// Types
export type {
  InvestmentOpportunity,
  InvestmentPortfolio,
  InvestmentDecision,
  CashflowStrategy,
  InvestmentIntelligence,
  INVESTMENT_FUND_TIERS
} from './types'

// Main API
export const StrategicInvestments = {
  /**
   * Initialize the investment engine
   */
  async initialize(): Promise<void> {
    const { IntelligenceInvestmentService } = await import('./services/IntelligenceInvestmentService')
    const { CashflowReinvestmentService } = await import('./services/CashflowReinvestmentService')
    
    // Start services
    IntelligenceInvestmentService.getInstance()
    CashflowReinvestmentService.getInstance()
    
    logger.info('Strategic Investment Engine initialized')
  },
  
  /**
   * Get current investment opportunities
   */
  async getOpportunities(): Promise<any[]> {
    const { IntelligenceInvestmentService } = await import('./services/IntelligenceInvestmentService')
    return IntelligenceInvestmentService.getInstance().identifyOpportunities()
  },
  
  /**
   * Get portfolio performance
   */
  async getPortfolio(): Promise<unknown> {
    const { IntelligenceInvestmentService } = await import('./services/IntelligenceInvestmentService')
    return IntelligenceInvestmentService.getInstance().monitorPortfolio()
  },
  
  /**
   * Execute reinvestment cycle
   */
  async reinvestCashflow(): Promise<unknown> {
    const { CashflowReinvestmentService } = await import('./services/CashflowReinvestmentService')
    return CashflowReinvestmentService.getInstance().executeReinvestmentCycle()
  },
  
  /**
   * Project future returns
   */
  async projectReturns(months: number = 12): Promise<unknown> {
    const { CashflowReinvestmentService } = await import('./services/CashflowReinvestmentService')
    return CashflowReinvestmentService.getInstance().projectCashflow(months)
  }
}

// Auto-initialize if in production
if (process.env.NODE_ENV === 'production') {
  StrategicInvestments.initialize().catch((error) => logger.error('Strategic investments initialization error:', error))
}