/**
 * Custom hooks for Indigenous-specific analytics
 * Ensures data sovereignty while tracking meaningful metrics
 */

import { useCallback, useEffect, useRef } from 'react';
import { useUmami } from '@/components/analytics/UmamiProvider';
import { useRouter } from 'next/router';

/**
 * Track RFQ interactions with privacy-preserving analytics
 */
export function useRFQTracking(rfqId: string) {
  const { trackRFQEvent } = useUmami();
  const hasTrackedView = useRef(false);

  // Track RFQ view (only once per session)
  useEffect(() => {
    if (!hasTrackedView.current && rfqId) {
      trackRFQEvent({
        rfqId,
        actionType: 'view',
      });
      hasTrackedView.current = true;
    }
  }, [rfqId, trackRFQEvent]);

  // Track download action
  const trackDownload = useCallback((documentType?: string) => {
    trackRFQEvent({
      rfqId,
      actionType: 'download',
    });
  }, [rfqId, trackRFQEvent]);

  // Track interest submission
  const trackInterest = useCallback((businessType?: string, certificationStatus?: string) => {
    trackRFQEvent({
      rfqId,
      actionType: 'submit_interest',
      businessType: businessType as unknown,
      certificationStatus: certificationStatus as unknown,
    });
  }, [rfqId, trackRFQEvent]);

  // Track bid submission
  const trackBidSubmission = useCallback((businessType?: string, certificationStatus?: string) => {
    trackRFQEvent({
      rfqId,
      actionType: 'bid_submitted',
      businessType: businessType as unknown,
      certificationStatus: certificationStatus as unknown,
    });
  }, [rfqId, trackRFQEvent]);

  return {
    trackDownload,
    trackInterest,
    trackBidSubmission,
  };
}

/**
 * Track business registration funnel
 */
export function useRegistrationTracking() {
  const { trackRegistrationStep } = useUmami();
  const stepStartTime = useRef<number>();
  const currentStep = useRef<string>();

  const startStep = useCallback((step: string) => {
    stepStartTime.current = Date.now();
    currentStep.current = step;
  }, []);

  const completeStep = useCallback((businessType?: string) => {
    if (currentStep.current && stepStartTime.current) {
      const timeSpent = Math.round((Date.now() - stepStartTime.current) / 1000);
      
      trackRegistrationStep({
        step: currentStep.current,
        completed: true,
        timeSpent,
        businessType,
      });
    }
  }, [trackRegistrationStep]);

  const abandonStep = useCallback(() => {
    if (currentStep.current && stepStartTime.current) {
      const timeSpent = Math.round((Date.now() - stepStartTime.current) / 1000);
      
      trackRegistrationStep({
        step: currentStep.current,
        completed: false,
        timeSpent,
      });
    }
  }, [trackRegistrationStep]);

  // Track abandonment on unmount
  useEffect(() => {
    return () => {
      if (currentStep.current && !window.location.pathname.includes('success')) {
        abandonStep();
      }
    };
  }, [abandonStep]);

  return {
    startStep,
    completeStep,
    abandonStep,
  };
}

/**
 * Track elder consultation engagement
 */
export function useElderConsultationTracking() {
  const { trackElderConsultation } = useUmami();

  const trackConsultation = useCallback((
    consultationType: string,
    engagementLevel: 'initial' | 'ongoing' | 'completed',
    communityRegion?: string
  ) => {
    trackElderConsultation({
      consultationType,
      engagementLevel,
      communityRegion,
    });
  }, [trackElderConsultation]);

  return { trackConsultation };
}

/**
 * Track search behavior without compromising privacy
 */
export function useSearchTracking() {
  const { trackSearch } = useUmami();
  const searchDebounceRef = useRef<NodeJS.Timeout>();

  const trackSearchQuery = useCallback((
    query: string,
    resultCount: number,
    filters?: Record<string, any>
  ) => {
    // Debounce search tracking to avoid too many events
    clearTimeout(searchDebounceRef.current);
    
    searchDebounceRef.current = setTimeout(() => {
      trackSearch(query, resultCount, filters);
    }, 1000);
  }, [trackSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(searchDebounceRef.current);
    };
  }, []);

  return { trackSearchQuery };
}

/**
 * Track time spent on important pages
 */
export function useEngagementTracking(pageName: string) {
  const { trackEvent } = useUmami();
  const startTime = useRef<number>();
  const isTracking = useRef(false);

  useEffect(() => {
    // Start tracking when component mounts
    startTime.current = Date.now();
    isTracking.current = true;

    // Track engagement when user leaves
    const trackEngagement = () => {
      if (startTime.current && isTracking.current) {
        const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
        
        // Only track if user spent more than 3 seconds
        if (timeSpent > 3) {
          trackEvent('page_engagement', {
            page: pageName,
            time_spent_seconds: timeSpent,
            engagement_level: 
              timeSpent < 30 ? 'low' :
              timeSpent < 120 ? 'medium' : 'high',
          });
        }
        
        isTracking.current = false;
      }
    };

    // Track on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEngagement();
      } else if (!isTracking.current) {
        // Resume tracking
        startTime.current = Date.now();
        isTracking.current = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track on unmount
    return () => {
      trackEngagement();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pageName, trackEvent]);
}

/**
 * Track feature adoption
 */
export function useFeatureTracking() {
  const { trackEvent } = useUmami();
  const trackedFeatures = useRef(new Set<string>());

  const trackFeatureUse = useCallback((featureName: string, metadata?: Record<string, any>) => {
    // Track first use of feature in session
    if (!trackedFeatures.current.has(featureName)) {
      trackEvent('feature_first_use', {
        feature: featureName,
        ...metadata,
      });
      trackedFeatures.current.add(featureName);
    } else {
      // Track subsequent uses
      trackEvent('feature_use', {
        feature: featureName,
        ...metadata,
      });
    }
  }, [trackEvent]);

  return { trackFeatureUse };
}

/**
 * Track accessibility feature usage
 */
export function useAccessibilityTracking() {
  const { trackEvent, trackPreference } = useUmami();

  const trackAccessibilityToggle = useCallback((feature: string, enabled: boolean) => {
    trackPreference(`accessibility_${feature}`, enabled);
    trackEvent('accessibility_feature_toggled', {
      feature,
      enabled,
    });
  }, [trackEvent, trackPreference]);

  return { trackAccessibilityToggle };
}

/**
 * Track performance metrics
 */
export function usePerformanceTracking() {
  const { trackEvent } = useUmami();
  const router = useRouter();

  useEffect(() => {
    // Track Web Vitals when available
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Track Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          trackEvent('web_vitals', {
            metric: 'lcp',
            value: Math.round(lastEntry.startTime),
            page: router.pathname,
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Track First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: unknown) => {
            trackEvent('web_vitals', {
              metric: 'fid',
              value: Math.round(entry.processingStart - entry.startTime),
              page: router.pathname,
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
        };
      } catch (error) {
        // Fail silently if Performance Observer not supported
      }
    }
  }, [router.pathname, trackEvent]);
}