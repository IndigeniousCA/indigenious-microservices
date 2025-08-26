// Professional Marketplace Hook
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { 
  ProfessionalMarketplaceService, 
  Professional, 
  ProfessionalRecommendation,
  MarketIntelligence 
} from '../services/ProfessionalMarketplaceService';
import { useUser } from '@/contexts/user-context';
import type { UniversalBusinessRequest } from '@/features/universal-request-engine/types';

export interface UseProfessionalMarketplaceOptions {
  category?: string;
  location?: string;
  autoMatch?: boolean;
  maxResults?: number;
}

export interface UseProfessionalMarketplaceReturn {
  // Professionals
  professionals: Professional[];
  recommendations: ProfessionalRecommendation[];
  
  // Market data
  marketIntelligence: MarketIntelligence | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingRecommendations: boolean;
  error: Error | null;
  
  // Actions
  searchProfessionals: (query: string) => Promise<void>;
  getRecommendations: (request: Partial<UniversalBusinessRequest>) => Promise<void>;
  compareProfessionals: (ids: string[]) => Professional[];
  optimizeProfile: (professionalId: string) => Promise<unknown>;
  predictSuccess: (professionalId: string, request: UniversalBusinessRequest) => Promise<unknown>;
  
  // Service instance
  service: ProfessionalMarketplaceService;
}

export function useProfessionalMarketplace(
  options: UseProfessionalMarketplaceOptions = {}
): UseProfessionalMarketplaceReturn {
  const { user } = useUser();
  const [service] = useState(() => new ProfessionalMarketplaceService());
  
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [recommendations, setRecommendations] = useState<ProfessionalRecommendation[]>([]);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    category,
    location,
    autoMatch = true,
    maxResults = 20
  } = options;
  
  // Load market intelligence
  useEffect(() => {
    const loadMarketIntelligence = async () => {
      if (!category) return;
      
      try {
        const intelligence = await service.getMarketIntelligence(category, location);
        setMarketIntelligence(intelligence);
      } catch (err) {
        logger.error('Error loading market intelligence:', err);
      }
    };
    
    loadMarketIntelligence();
  }, [service, category, location]);
  
  // Search professionals
  const searchProfessionals = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In production, this would search the database
      // For now, using mock data with filtering
      const mockProfessionals = await service['getMockProfessionals']();
      const filtered = mockProfessionals.filter(prof =>
        prof.name.toLowerCase().includes(query.toLowerCase()) ||
        prof.specializations.some(s => s.toLowerCase().includes(query.toLowerCase()))
      );
      
      setProfessionals(filtered.slice(0, maxResults));
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [service, maxResults]);
  
  // Get AI recommendations
  const getRecommendations = useCallback(async (
    request: Partial<UniversalBusinessRequest>
  ) => {
    if (!user?.id) return;
    
    setIsLoadingRecommendations(true);
    setError(null);
    
    try {
      const recs = await service.getAIRecommendations(
        request,
        user.id,
        user.businessId
      );
      
      setRecommendations(recs);
      
      // Also set professionals from recommendations
      const profsFromRecs = recs.map(r => r.professional);
      setProfessionals(prev => {
        // Merge with existing, avoiding duplicates
        const existing = new Set(prev.map(p => p.id));
        const newProfs = profsFromRecs.filter(p => !existing.has(p.id));
        return [...prev, ...newProfs];
      });
      
      // Auto-match if enabled
      if (autoMatch && request.id) {
        await service.autoMatchAndNotify(request as UniversalBusinessRequest, user.id);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [service, user, autoMatch]);
  
  // Compare professionals
  const compareProfessionals = useCallback((ids: string[]) => {
    return professionals.filter(p => ids.includes(p.id));
  }, [professionals]);
  
  // Optimize professional profile
  const optimizeProfile = useCallback(async (professionalId: string) => {
    return service.optimizeProfile(professionalId);
  }, [service]);
  
  // Predict success for a professional
  const predictSuccess = useCallback(async (
    professionalId: string,
    request: UniversalBusinessRequest
  ) => {
    return service.predictSuccess(professionalId, request);
  }, [service]);
  
  return {
    professionals,
    recommendations,
    marketIntelligence,
    isLoading,
    isLoadingRecommendations,
    error,
    searchProfessionals,
    getRecommendations,
    compareProfessionals,
    optimizeProfile,
    predictSuccess,
    service
  };
}

// Hook for professional providers to optimize their presence
export function useProfessionalProfile(professionalId: string) {
  const [service] = useState(() => new ProfessionalMarketplaceService());
  const [optimization, setOptimization] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadOptimization = async () => {
      setIsLoading(true);
      
      try {
        const result = await service.optimizeProfile(professionalId);
        setOptimization(result);
      } catch (error) {
        logger.error('Error loading profile optimization:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOptimization();
  }, [service, professionalId]);
  
  return {
    optimization,
    isLoading,
    refreshOptimization: async () => {
      const result = await service.optimizeProfile(professionalId);
      setOptimization(result);
    }
  };
}

// Hook for real-time market insights
export function useMarketInsights(categories: string[]) {
  const [service] = useState(() => new ProfessionalMarketplaceService());
  const [insights, setInsights] = useState<Record<string, MarketIntelligence>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true);
      
      try {
        const results = await Promise.all(
          categories.map(cat => service.getMarketIntelligence(cat))
        );
        
        const insightsMap: Record<string, MarketIntelligence> = {};
        results.forEach((result, index) => {
          insightsMap[categories[index]] = result;
        });
        
        setInsights(insightsMap);
      } catch (error) {
        logger.error('Error loading market insights:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInsights();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadInsights, 300000);
    return () => clearInterval(interval);
  }, [service, categories]);
  
  return {
    insights,
    isLoading,
    getInsightForCategory: (category: string) => insights[category],
    getTrends: () => {
      const trends: unknown[] = [];
      Object.entries(insights).forEach(([category, data]) => {
        if (data.priceTrend !== 0) {
          trends.push({
            category,
            trend: data.priceTrend,
            direction: data.priceTrend > 0 ? 'up' : 'down'
          });
        }
      });
      return trends.sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend));
    }
  };
}