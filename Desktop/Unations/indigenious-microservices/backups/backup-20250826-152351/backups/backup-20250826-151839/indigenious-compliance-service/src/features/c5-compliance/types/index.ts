// C-5 Compliance Types
export interface C5ComplianceData {
  organizationId: string;
  organizationName: string;
  fiscalYear: number;
  totalProcurement: number;
  indigenousProcurement: number;
  compliancePercentage: number;
  targetPercentage: number;
  status: ComplianceStatus;
  categories: CategoryBreakdown[];
  timeline: ComplianceTimeline[];
  projections: ComplianceProjection[];
  gaps: ComplianceGap[];
  opportunities: ComplianceOpportunity[];
}

export type ComplianceStatus = 'compliant' | 'at-risk' | 'non-compliant' | 'exceeding';

export interface CategoryBreakdown {
  category: string;
  totalSpend: number;
  indigenousSpend: number;
  percentage: number;
  supplierCount: number;
  indigenousSupplierCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  opportunities: number;
}

export interface ComplianceTimeline {
  date: Date;
  percentage: number;
  totalSpend: number;
  indigenousSpend: number;
  milestone?: string;
}

export interface ComplianceProjection {
  month: string;
  projectedPercentage: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  assumptions: string[];
  requiredActions?: string[];
}

export interface ComplianceGap {
  id: string;
  type: 'spend' | 'suppliers' | 'categories' | 'regions';
  title: string;
  description: string;
  impact: number; // dollar amount or percentage points
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendations: ComplianceRecommendation[];
}

export interface ComplianceRecommendation {
  id: string;
  title: string;
  description: string;
  potentialImpact: number;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  category?: string;
  suppliers?: SupplierSuggestion[];
}

export interface SupplierSuggestion {
  id: string;
  name: string;
  category: string;
  capabilities: string[];
  estimatedSpend: number;
  location: string;
  certifications: string[];
  matchScore: number;
}

export interface ComplianceOpportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  potentialValue: number;
  indigenousSuppliers: number;
  deadline?: Date;
  quickWin: boolean;
  implementationSteps: string[];
}

export interface ComplianceMetrics {
  currentCompliance: number;
  targetCompliance: number;
  gapToTarget: number;
  yoyGrowth: number;
  quarterlyTrend: number;
  projectedYearEnd: number;
  riskScore: number;
  opportunityScore: number;
}

export interface SupplierDiversity {
  totalSuppliers: number;
  indigenousSuppliers: number;
  newIndigenousSuppliers: number;
  byCategory: Record<string, {
    total: number;
    indigenous: number;
    percentage: number;
  }>;
  byRegion: Record<string, {
    total: number;
    indigenous: number;
    percentage: number;
  }>;
  certificationTypes: Record<string, number>;
}

export interface ComplianceAlert {
  id: string;
  type: 'warning' | 'opportunity' | 'achievement' | 'deadline';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionRequired?: string;
  deadline?: Date;
  relatedCategory?: string;
  potentialImpact?: number;
}

export interface ComplianceReport {
  id: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  summary: {
    overallCompliance: number;
    totalSpend: number;
    indigenousSpend: number;
    supplierCount: number;
    newSuppliers: number;
    topCategories: CategoryBreakdown[];
    keyAchievements: string[];
    challenges: string[];
  };
  detailedBreakdown: CategoryBreakdown[];
  recommendations: ComplianceRecommendation[];
  nextSteps: string[];
}