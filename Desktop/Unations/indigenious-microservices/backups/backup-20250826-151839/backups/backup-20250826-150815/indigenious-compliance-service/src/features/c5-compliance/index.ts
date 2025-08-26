// C-5 Compliance Feature Exports
export { C5ComplianceDashboard } from './components/C5ComplianceDashboard';
export { C5ComplianceService } from './services/C5ComplianceService';
export { 
  useC5Compliance,
  useComplianceProgress,
  useComplianceOpportunities,
  useComplianceMonitoring
} from './hooks/useC5Compliance';

// Export types
export type {
  C5ComplianceData,
  ComplianceStatus,
  CategoryBreakdown,
  ComplianceTimeline,
  ComplianceProjection,
  ComplianceGap,
  ComplianceRecommendation,
  ComplianceOpportunity,
  ComplianceMetrics,
  SupplierDiversity,
  ComplianceAlert,
  ComplianceReport,
  SupplierSuggestion
} from './types';

export type {
  UseC5ComplianceOptions,
  UseC5ComplianceReturn
} from './hooks/useC5Compliance';