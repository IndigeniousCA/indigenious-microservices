// Export all vendor performance components and types

export { VendorPerformanceDashboard } from './components/VendorPerformanceDashboard'
export { PerformanceMetrics } from './components/PerformanceMetrics'
export { ProjectHistory } from './components/ProjectHistory'
export { ReviewsSection } from './components/ReviewsSection'
export { CertificationsAwards } from './components/CertificationsAwards'
export { RiskAnalysis } from './components/RiskAnalysis'

export { useVendorPerformance } from './hooks/useVendorPerformance'

export type {
  VendorPerformance,
  PerformanceMetric,
  CompletedProject,
  VendorReview,
  Certification,
  CertificationCategory,
  Award,
  RiskFactor,
  RiskType,
  ProjectIssue,
  PerformanceComparison,
  PerformanceMetrics,
  PerformanceFilters,
  PerformanceReport,
  ReportSection,
  ImprovementPlan,
  ImprovementArea,
  ImprovementMilestone
} from './types/performance.types'