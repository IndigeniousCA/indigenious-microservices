// Professional Marketplace Types

export type ServiceCategory = 
  | 'Legal'
  | 'Financial'
  | 'Technical'
  | 'Construction'
  | 'Environmental'
  | 'Cultural'
  | 'Management'
  | 'Consulting';

export type Province = 
  | 'BC' | 'AB' | 'SK' | 'MB' | 'ON' | 'QC' 
  | 'NB' | 'NS' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU';

export type PricingModel = 
  | 'Fixed' 
  | 'Hourly' 
  | 'Milestone' 
  | 'Percentage' 
  | 'Negotiable';

export interface Professional {
  id: string;
  name: string;
  category: ServiceCategory[];
  specializations: string[];
  indigenousOwned: boolean;
  indigenousPercentage?: number;
  rating: number;
  completedJobs: number;
  responseTime: number; // hours
  location: string;
  pricing: PricingInfo;
  certifications: string[];
  languages: string[];
  description: string;
  indigenousPartnership?: boolean;
  performance: PerformanceMetrics;
}

export interface PricingInfo {
  model: PricingModel;
  rate?: number; // For hourly
  projectRate?: number; // For project-based
  lpFormation?: number; // Specific service pricing
  marketRate: number; // For comparison
  savings: string; // Percentage saved
  indigenousDiscount?: number;
}

export interface PerformanceMetrics {
  onTimeDelivery: number; // Percentage
  clientSatisfaction: number; // Rating out of 5
  repeatClients: number; // Percentage
  disputeRate: number; // Percentage
  indigenousClients: number; // Percentage
  averageProjectValue: number;
}