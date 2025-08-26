// C-5 Compliance Hook
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { C5ComplianceService } from '../services/C5ComplianceService';
import type {
  C5ComplianceData,
  ComplianceMetrics,
  SupplierDiversity,
  ComplianceAlert,
  ComplianceReport,
  SupplierSuggestion
} from '../types';
import { useUser } from '@/contexts/user-context';

export interface UseC5ComplianceOptions {
  organizationId?: string;
  fiscalYear?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseC5ComplianceReturn {
  // Data
  dashboardData: C5ComplianceData | null;
  metrics: ComplianceMetrics | null;
  diversity: SupplierDiversity | null;
  alerts: ComplianceAlert[];
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  refreshData: () => Promise<void>;
  generateReport: (type: 'monthly' | 'quarterly' | 'annual') => Promise<ComplianceReport>;
  findSuppliers: (category: string, requirements?: any) => Promise<SupplierSuggestion[]>;
  dismissAlert: (alertId: string) => void;
  
  // Service instance
  service: C5ComplianceService;
}

export function useC5Compliance(
  options: UseC5ComplianceOptions = {}
): UseC5ComplianceReturn {
  const { user } = useUser();
  const [service] = useState(() => new C5ComplianceService());
  
  const [dashboardData, setDashboardData] = useState<C5ComplianceData | null>(null);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [diversity, setDiversity] = useState<SupplierDiversity | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    organizationId = user?.businessId,
    fiscalYear = new Date().getFullYear(),
    autoRefresh = true,
    refreshInterval = 300000 // 5 minutes
  } = options;
  
  // Fetch all compliance data
  const fetchComplianceData = useCallback(async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [dashboard, metricsData, diversityData, alertsData] = await Promise.all([
        service.getComplianceDashboard(organizationId, fiscalYear),
        service.getComplianceMetrics(organizationId),
        service.getSupplierDiversity(organizationId),
        service.generateComplianceAlerts(organizationId)
      ]);
      
      setDashboardData(dashboard);
      setMetrics(metricsData);
      setDiversity(diversityData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err as Error);
      logger.error('Error fetching compliance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [service, organizationId, fiscalYear]);
  
  // Initial fetch
  useEffect(() => {
    fetchComplianceData();
  }, [fetchComplianceData]);
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchComplianceData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchComplianceData]);
  
  // Generate compliance report
  const generateReport = useCallback(async (
    type: 'monthly' | 'quarterly' | 'annual'
  ): Promise<ComplianceReport> => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    
    return service.generateComplianceReport(organizationId, type);
  }, [service, organizationId]);
  
  // Find Indigenous suppliers
  const findSuppliers = useCallback(async (
    category: string,
    requirements?: any
  ): Promise<SupplierSuggestion[]> => {
    return service.findIndigenousSuppliers(category, requirements || {});
  }, [service]);
  
  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);
  
  return {
    dashboardData,
    metrics,
    diversity,
    alerts,
    isLoading,
    error,
    refreshData: fetchComplianceData,
    generateReport,
    findSuppliers,
    dismissAlert,
    service
  };
}

// Hook for tracking compliance progress over time
export function useComplianceProgress(organizationId?: string) {
  const [service] = useState(() => new C5ComplianceService());
  const [progress, setProgress] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchProgress = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      
      try {
        // Fetch data for last 12 months
        const months: unknown[] = [];
        const currentYear = new Date().getFullYear();
        
        for (let month = 0; month < 12; month++) {
          const dashboard = await service.getComplianceDashboard(
            organizationId,
            currentYear - (month >= new Date().getMonth() ? 1 : 0)
          );
          
          months.push({
            month: new Date(currentYear, month, 1),
            compliance: dashboard.compliancePercentage,
            spend: dashboard.indigenousProcurement,
            total: dashboard.totalProcurement
          });
        }
        
        setProgress(months);
      } catch (error) {
        logger.error('Error fetching compliance progress:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgress();
  }, [service, organizationId]);
  
  return {
    progress,
    isLoading,
    getAverageGrowth: () => {
      if (progress.length < 2) return 0;
      
      const firstMonth = progress[0];
      const lastMonth = progress[progress.length - 1];
      
      return ((lastMonth.compliance - firstMonth.compliance) / progress.length).toFixed(2);
    }
  };
}

// Hook for compliance opportunities
export function useComplianceOpportunities(
  organizationId?: string,
  category?: string
) {
  const [service] = useState(() => new C5ComplianceService());
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      
      try {
        const dashboard = await service.getComplianceDashboard(organizationId);
        
        // Filter by category if specified
        const filtered = category
          ? dashboard.opportunities.filter(o => o.category === category)
          : dashboard.opportunities;
        
        setOpportunities(filtered);
      } catch (error) {
        logger.error('Error fetching opportunities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOpportunities();
  }, [service, organizationId, category]);
  
  return {
    opportunities,
    isLoading,
    quickWins: opportunities.filter(o => o.quickWin),
    totalValue: opportunities.reduce((sum, o) => sum + o.potentialValue, 0),
    getByCategory: (cat: string) => opportunities.filter(o => o.category === cat)
  };
}

// Hook for real-time compliance monitoring
export function useComplianceMonitoring(organizationId?: string) {
  const { user } = useUser();
  const [service] = useState(() => new C5ComplianceService());
  const [currentCompliance, setCurrentCompliance] = useState<number | null>(null);
  const [targetCompliance] = useState(5.0);
  const [status, setStatus] = useState<string>('unknown');
  
  const orgId = organizationId || user?.businessId;
  
  useEffect(() => {
    if (!orgId) return;
    
    const checkCompliance = async () => {
      try {
        const metrics = await service.getComplianceMetrics(orgId);
        setCurrentCompliance(metrics.currentCompliance);
        
        // Determine status
        if (metrics.currentCompliance >= targetCompliance) {
          setStatus('compliant');
        } else if (metrics.currentCompliance >= targetCompliance * 0.8) {
          setStatus('at-risk');
        } else {
          setStatus('non-compliant');
        }
      } catch (error) {
        logger.error('Error monitoring compliance:', error);
      }
    };
    
    // Check immediately
    checkCompliance();
    
    // Check every minute
    const interval = setInterval(checkCompliance, 60000);
    return () => clearInterval(interval);
  }, [service, orgId, targetCompliance]);
  
  return {
    currentCompliance,
    targetCompliance,
    status,
    gap: currentCompliance ? targetCompliance - currentCompliance : null,
    isCompliant: currentCompliance ? currentCompliance >= targetCompliance : false
  };
}