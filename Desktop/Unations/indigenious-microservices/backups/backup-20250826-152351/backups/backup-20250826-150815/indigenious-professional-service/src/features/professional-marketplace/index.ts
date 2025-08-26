// Professional Marketplace Feature Exports
export { ProfessionalMarketplace } from './components/ProfessionalMarketplace';
export { ProfessionalMarketplaceService } from './services/ProfessionalMarketplaceService';
export { 
  useProfessionalMarketplace,
  useProfessionalProfile,
  useMarketInsights
} from './hooks/useProfessionalMarketplace';

// Export types
export type {
  Professional,
  PricingModel,
  ProjectExample,
  AvailabilityStatus,
  AIMatchScore,
  MarketIntelligence,
  MarketInsight,
  ProfessionalRecommendation,
  BundleOpportunity,
  RiskFactor
} from './services/ProfessionalMarketplaceService';

export type {
  UseProfessionalMarketplaceOptions,
  UseProfessionalMarketplaceReturn
} from './hooks/useProfessionalMarketplace';