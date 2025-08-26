// Price Transparency Hook
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { PriceTransparencyService, PriceTrend, PriceInsight, MarketCompression } from '../services/PriceTransparencyService';
import { useUser } from '@/contexts/user-context';

export interface UsePriceTransparencyOptions {
  category?: string;
  location?: string;
  timeRange?: '1M' | '3M' | '6M' | '1Y';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePriceTransparencyReturn {
  // Price data
  priceData: PriceTrend | null;
  marketCompression: MarketCompression | null;
  insights: PriceInsight[];
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  refreshData: () => Promise<void>;
  setPriceAlert: (threshold: number, type: 'above' | 'below') => Promise<string>;
  getMarketIntelligence: () => Promise<unknown>;
  
  // Service instance for advanced usage
  service: PriceTransparencyService;
}

export function usePriceTransparency(
  options: UsePriceTransparencyOptions = {}
): UsePriceTransparencyReturn {
  const { user } = useUser();
  const [service] = useState(() => new PriceTransparencyService());
  
  const [priceData, setPriceData] = useState<PriceTrend | null>(null);
  const [marketCompression, setMarketCompression] = useState<MarketCompression | null>(null);
  const [insights, setInsights] = useState<PriceInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    category = 'all',
    location,
    timeRange = '3M',
    autoRefresh = true,
    refreshInterval = 300000 // 5 minutes
  } = options;
  
  // Fetch price data
  const fetchPriceData = useCallback(async () => {
    if (category === 'all') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get price analysis
      const analysis = await service.getPriceAnalysis(category, location, timeRange);
      setPriceData(analysis);
      setInsights(analysis.insights);
      
      // Get market compression
      const compression = await service.calculateMarketCompression(category, timeRange);
      setMarketCompression(compression);
    } catch (err) {
      setError(err as Error);
      logger.error('Error fetching price data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [service, category, location, timeRange]);
  
  // Initial fetch
  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchPriceData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchPriceData]);
  
  // Set price alert
  const setPriceAlert = useCallback(async (
    threshold: number,
    type: 'above' | 'below'
  ): Promise<string> => {
    if (!user?.id) {
      throw new Error('User must be logged in to set price alerts');
    }
    
    return service.setPriceAlert(
      user.id,
      category,
      threshold,
      type,
      location
    );
  }, [service, user, category, location]);
  
  // Get market intelligence
  const getMarketIntelligence = useCallback(async () => {
    return service.getMarketIntelligence(category, location);
  }, [service, category, location]);
  
  return {
    priceData,
    marketCompression,
    insights,
    isLoading,
    error,
    refreshData: fetchPriceData,
    setPriceAlert,
    getMarketIntelligence,
    service
  };
}

// Hook for multiple categories
export function usePriceComparison(
  categories: string[],
  options: Omit<UsePriceTransparencyOptions, 'category'> = {}
) {
  const [service] = useState(() => new PriceTransparencyService());
  const [comparisons, setComparisons] = useState<Record<string, PriceTrend>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { location, timeRange = '3M' } = options;
  
  useEffect(() => {
    const fetchComparisons = async () => {
      setIsLoading(true);
      
      try {
        const results = await Promise.all(
          categories.map(cat => service.getPriceAnalysis(cat, location, timeRange))
        );
        
        const comparisonMap: Record<string, PriceTrend> = {};
        results.forEach((result, index) => {
          comparisonMap[categories[index]] = result;
        });
        
        setComparisons(comparisonMap);
      } catch (error) {
        logger.error('Error fetching price comparisons:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComparisons();
  }, [service, categories, location, timeRange]);
  
  return {
    comparisons,
    isLoading,
    getBestCategory: () => {
      // Find category with best price trend
      let bestCategory = '';
      let bestChange = Infinity;
      
      Object.entries(comparisons).forEach(([cat, data]) => {
        if (data.changePercent < bestChange) {
          bestChange = data.changePercent;
          bestCategory = cat;
        }
      });
      
      return bestCategory;
    }
  };
}

// Hook for AI insights across all categories
export function useMarketInsights() {
  const [service] = useState(() => new PriceTransparencyService());
  const [allInsights, setAllInsights] = useState<PriceInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchAllInsights = async () => {
      setIsLoading(true);
      
      try {
        const categories = [
          'Residential Construction',
          'Commercial Construction',
          'Legal Services',
          'Engineering Services',
          'IT Services',
          'Consulting'
        ];
        
        const insightPromises = categories.map(cat =>
          service.getPriceAnalysis(cat).then(analysis => analysis.insights)
        );
        
        const results = await Promise.all(insightPromises);
        const flattenedInsights = results.flat();
        
        // Sort by priority and deduplicate
        const uniqueInsights = flattenedInsights.filter((insight, index, self) =>
          index === self.findIndex(i => i.title === insight.title)
        );
        
        setAllInsights(uniqueInsights.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }));
      } catch (error) {
        logger.error('Error fetching market insights:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllInsights();
  }, [service]);
  
  return {
    insights: allInsights,
    isLoading,
    getInsightsByType: (type: PriceInsight['type']) => 
      allInsights.filter(i => i.type === type),
    getHighPriorityInsights: () =>
      allInsights.filter(i => i.priority === 'high')
  };
}