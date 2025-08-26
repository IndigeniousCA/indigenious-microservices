/**
 * Unified Platform Exports
 * The complete ecosystem that appears simple but controls $1T+ in Canadian projects
 */

// Universal Payment Certainty
export { default as UniversalEscrowService } from '@/features/payment-rails/universal-escrow-service'
export type { 
  PaymentCertificate, 
  CapitalLeverage 
} from '@/features/payment-rails/universal-escrow-service'

// Bonding Intelligence Marketplace
export { default as BondingMarketplaceService } from '@/features/bonding-marketplace/services/BondingMarketplaceService'
export type {
  BondingOpportunity,
  SuretyCompanyProfile,
  BondApplication,
  MarketIntelligence,
  CommissionTier,
  COMMISSION_TIERS
} from '@/features/bonding-marketplace/types'

// Simplified Interfaces (Kindergarten Simple)
export { QuickPaySimple } from '@/features/simplified-interfaces/QuickPaySimple'
export { BondingHubSimple } from '@/features/simplified-interfaces/BondingHubSimple'
export { BondingIntelSimple } from '@/features/simplified-interfaces/BondingIntelSimple'

// Ambient Intelligence
export { 
  UniversalAmbientService,
  ambientService 
} from '@/features/ambient-intelligence/UniversalAmbientService'

// Capital Leverage Tracking
export { CapitalLeverageTracker } from '@/features/capital-leverage/CapitalLeverageTracker'

// Integration Helpers
export const UnifiedPlatform = {
  /**
   * Initialize all services with ambient intelligence
   */
  async initialize(userId: string, userType: string): Promise<void> {
    const { ambientService } = await import('@/features/ambient-intelligence/UniversalAmbientService')
    
    await ambientService.updateUserContext(userId, {
      userId,
      userType: userType as unknown,
      currentActivity: 'platform_initialized'
    })
  },
  
  /**
   * Get simple interface based on user type
   */
  getInterface(userType: string): any {
    switch (userType) {
      case 'indigenous_business':
        return QuickPaySimple
      case 'contractor':
        return BondingHubSimple
      case 'surety':
        return BondingIntelSimple
      default:
        return null
    }
  },
  
  /**
   * Track capital leverage event
   */
  async trackLeverage(
    governmentAmount: number,
    privateAmount: number,
    projectId: string
  ): Promise<void> {
    const { indigenousLedger } = await import('@/lib/security/sealed-logs/indigenous-ledger')
    
    await indigenousLedger.log(
      'capital.leverage',
      'info',
      'Private capital unlocked',
      {
        governmentAmount,
        privateAmount,
        ratio: privateAmount / governmentAmount,
        projectId,
        timestamp: new Date()
      }
    )
  }
}

// Platform Configuration
export const PLATFORM_CONFIG = {
  // Fee Structure
  fees: {
    escrow: {
      standard: 0.01,      // 1%
      quickPay: 0.005,     // 0.5% extra
      volumeDiscount: 0.25 // 25% off for large contracts
    },
    bonding: {
      bronze: 0.30,    // 30% commission
      silver: 0.32,    // 32% commission
      gold: 0.35,      // 35% commission
      platinum: 0.35   // 35% + perks
    }
  },
  
  // Thresholds
  thresholds: {
    volumeDiscountMin: 10000000,  // $10M
    quickPayGuarantee: 24,        // hours
    leverageTarget: 5             // 5x minimum
  },
  
  // Market Positioning
  positioning: {
    public: 'Indigenous procurement platform',
    reality: 'Financial infrastructure for Canadian resource economy',
    trojanHorse: true
  }
}

// Export everything for easy access
export default {
  UniversalEscrowService,
  BondingMarketplaceService,
  QuickPaySimple,
  BondingHubSimple,
  BondingIntelSimple,
  UniversalAmbientService,
  CapitalLeverageTracker,
  UnifiedPlatform,
  PLATFORM_CONFIG
}