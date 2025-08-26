/**
 * Umami Analytics Provider Component
 * Wraps the application to provide analytics functionality
 * with complete data sovereignty
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { analytics, usePageTracking } from '@/lib/analytics/umami-client';

interface UmamiContextType {
  trackEvent: typeof analytics.trackEvent;
  trackRFQEvent: typeof analytics.trackRFQEvent;
  trackRegistrationStep: typeof analytics.trackRegistrationStep;
  trackElderConsultation: typeof analytics.trackElderConsultation;
  trackSearch: typeof analytics.trackSearch;
  trackPreference: typeof analytics.trackPreference;
}

const UmamiContext = createContext<UmamiContextType | undefined>(undefined);

interface UmamiProviderProps {
  children: ReactNode;
  config?: {
    websiteId?: string;
    hostUrl?: string;
    ignoreLocalhost?: boolean;
    respectDoNotTrack?: boolean;
  };
}

export function UmamiProvider({ children, config }: UmamiProviderProps) {
  // Initialize page tracking
  usePageTracking();

  useEffect(() => {
    // Initialize analytics with config
    if (config?.websiteId) {
      // Override environment config if provided
      (window as any).__UMAMI_WEBSITE_ID__ = config.websiteId;
    }
    if (config?.hostUrl) {
      (window as any).__UMAMI_HOST_URL__ = config.hostUrl;
    }

    // Initialize analytics
    analytics.init();

    // Track app initialization
    analytics.trackEvent('app_initialized', {
      platform: 'indigenous_procurement',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    });
  }, [config]);

  const contextValue: UmamiContextType = {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackRFQEvent: analytics.trackRFQEvent.bind(analytics),
    trackRegistrationStep: analytics.trackRegistrationStep.bind(analytics),
    trackElderConsultation: analytics.trackElderConsultation.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackPreference: analytics.trackPreference.bind(analytics),
  };

  return (
    <UmamiContext.Provider value={contextValue}>
      {children}
    </UmamiContext.Provider>
  );
}

/**
 * Hook to use Umami analytics
 */
export function useUmami() {
  const context = useContext(UmamiContext);
  if (!context) {
    throw new Error('useUmami must be used within UmamiProvider');
  }
  return context;
}

/**
 * Higher-order component to track component analytics
 */
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function AnalyticsWrappedComponent(props: P) {
    const { trackEvent } = useUmami();

    useEffect(() => {
      trackEvent('component_mounted', { component: componentName });
    }, [trackEvent]);

    return <Component {...props} />;
  };
}

/**
 * Privacy consent banner component
 */
export function PrivacyConsentBanner() {
  const [showBanner, setShowBanner] = React.useState(false);
  const { trackEvent } = useUmami();

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('analytics_consent');
    if (!hasConsented) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('analytics_consent', 'true');
    setShowBanner(false);
    trackEvent('privacy_consent', { action: 'accepted' });
  };

  const handleDecline = () => {
    localStorage.setItem('analytics_consent', 'false');
    setShowBanner(false);
    // Disable analytics
    (window as any).__UMAMI_DISABLE__ = true;
    trackEvent('privacy_consent', { action: 'declined' });
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Privacy & Analytics
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We use self-hosted analytics to improve your experience. All data stays within our 
            infrastructure and we never share it with third parties. We respect your privacy 
            and anonymize all collected data.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Accept Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Analytics dashboard link component
 */
export function AnalyticsDashboardLink() {
  const dashboardUrl = process.env.NEXT_PUBLIC_UMAMI_DASHBOARD_URL || '/analytics';
  
  return (
    <a
      href={dashboardUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      View Analytics Dashboard
    </a>
  );
}