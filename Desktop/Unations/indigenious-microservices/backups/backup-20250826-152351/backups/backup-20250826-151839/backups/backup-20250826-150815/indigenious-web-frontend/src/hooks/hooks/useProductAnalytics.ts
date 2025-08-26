/**
 * React Hook for Product Analytics
 * Provides easy-to-use analytics tracking for Indigenous Procurement Platform
 */

import { useCallback, useEffect, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useUser } from '@supabase/auth-helpers-react'
import { productAnalytics } from '@/lib/analytics/product-analytics-extension'

interface TrackingOptions {
  // Whether to include user properties automatically
  includeUserProperties?: boolean
  // Whether to include page/route info
  includePageContext?: boolean
  // Custom properties to always include
  defaultProperties?: Record<string, any>
  // Whether to track in development
  trackInDevelopment?: boolean
}

interface PageViewOptions {
  title?: string
  referrer?: string
  properties?: Record<string, any>
}

export function useProductAnalytics(options: TrackingOptions = {}) {
  const user = useUser()
  const sessionRef = useRef<string>()
  const pageViewRef = useRef<{ path: string; timestamp: number }>()

  const {
    includeUserProperties = true,
    includePageContext = true,
    defaultProperties = {},
    trackInDevelopment = false
  } = options

  // Check if we should track
  const shouldTrack = useCallback(() => {
    if (process.env.NODE_ENV === 'development' && !trackInDevelopment) {
      return false
    }
    return true
  }, [trackInDevelopment])

  /**
   * Track a custom event
   */
  const track = useCallback(async (
    event: string,
    properties?: Record<string, any>
  ) => {
    if (!shouldTrack() || !user?.id) return

    try {
      const enrichedProperties = {
        ...defaultProperties,
        ...properties
      }

      // Add page context if enabled
      if (includePageContext && typeof window !== 'undefined') {
        enrichedProperties.page = {
          path: window.location.pathname,
          search: window.location.search,
          title: document.title,
          referrer: document.referrer
        }
      }

      // Add user context
      if (includeUserProperties && user) {
        enrichedProperties.userContext = {
          businessType: user.user_metadata?.business_type,
          community: user.user_metadata?.community_id,
          role: user.user_metadata?.role,
          verified: user.user_metadata?.indigenous_verified
        }
      }

      await productAnalytics.track(event, user.id, enrichedProperties)
    } catch (error) {
      logger.error('Analytics tracking error:', error)
    }
  }, [user, shouldTrack, defaultProperties, includePageContext, includeUserProperties])

  /**
   * Track page views
   */
  const trackPageView = useCallback(async (options?: PageViewOptions) => {
    if (!shouldTrack() || !user?.id) return

    const currentPath = window.location.pathname
    const now = Date.now()

    // Debounce rapid navigation
    if (pageViewRef.current && 
        pageViewRef.current.path === currentPath && 
        now - pageViewRef.current.timestamp < 1000) {
      return
    }

    pageViewRef.current = { path: currentPath, timestamp: now }

    await track('page_viewed', {
      title: options?.title || document.title,
      path: currentPath,
      referrer: options?.referrer || document.referrer,
      ...options?.properties
    })
  }, [track, shouldTrack, user])

  /**
   * Track form submissions
   */
  const trackFormSubmit = useCallback(async (
    formName: string,
    success: boolean,
    properties?: Record<string, any>
  ) => {
    await track('form_submitted', {
      form_name: formName,
      success,
      ...properties
    })
  }, [track])

  /**
   * Track feature usage
   */
  const trackFeatureUse = useCallback(async (
    featureName: string,
    action?: string,
    properties?: Record<string, any>
  ) => {
    await track('feature_used', {
      feature: featureName,
      action: action || 'interact',
      ...properties
    })
  }, [track])

  /**
   * Track business metrics
   */
  const trackBusinessMetric = useCallback(async (
    metric: string,
    value: number,
    properties?: Record<string, any>
  ) => {
    await track('business_metric', {
      metric,
      value,
      ...properties
    })
  }, [track])

  /**
   * Track errors
   */
  const trackError = useCallback(async (
    error: Error | string,
    context?: Record<string, any>
  ) => {
    await track('error_occurred', {
      error_message: error instanceof Error ? error.message : error,
      error_stack: error instanceof Error ? error.stack : undefined,
      ...context
    })
  }, [track])

  /**
   * Track user journey milestones
   */
  const trackMilestone = useCallback(async (
    milestone: string,
    properties?: Record<string, any>
  ) => {
    await track('milestone_reached', {
      milestone,
      ...properties
    })
  }, [track])

  /**
   * Identify user (update properties)
   */
  const identify = useCallback(async (properties: Record<string, any>) => {
    if (!shouldTrack() || !user?.id) return

    try {
      await productAnalytics.identify(user.id, properties)
    } catch (error) {
      logger.error('Analytics identify error:', error)
    }
  }, [user, shouldTrack])

  /**
   * Track A/B test exposure
   */
  const trackExperiment = useCallback(async (
    experimentName: string,
    variant: string,
    properties?: Record<string, any>
  ) => {
    if (!shouldTrack() || !user?.id) return

    try {
      await productAnalytics.trackExperiment(
        user.id,
        experimentName,
        variant,
        properties
      )
    } catch (error) {
      logger.error('Analytics experiment error:', error)
    }
  }, [user, shouldTrack])

  // Auto-track page views on route change
  useEffect(() => {
    if (!shouldTrack()) return

    const handleRouteChange = () => {
      trackPageView()
    }

    // Track initial page view
    trackPageView()

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [trackPageView, shouldTrack])

  // Track session start
  useEffect(() => {
    if (!shouldTrack() || !user?.id || sessionRef.current) return

    const sessionId = `session-${Date.now()}`
    sessionRef.current = sessionId

    track('session_started', {
      session_id: sessionId,
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language
    })

    // Track session end on unload
    const handleUnload = () => {
      track('session_ended', {
        session_id: sessionId,
        duration: Date.now() - parseInt(sessionId.split('-')[1])
      })
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [user, track, shouldTrack])

  return {
    track,
    trackPageView,
    trackFormSubmit,
    trackFeatureUse,
    trackBusinessMetric,
    trackError,
    trackMilestone,
    identify,
    trackExperiment
  }
}

// Specific hooks for common use cases

/**
 * Track RFQ-related events
 */
export function useRFQAnalytics() {
  const analytics = useProductAnalytics({
    defaultProperties: { category: 'rfq' }
  })

  return {
    trackRFQCreated: (rfqId: string, value: number, type: string) =>
      analytics.track('rfq_created', { rfq_id: rfqId, value, type }),
    
    trackRFQViewed: (rfqId: string, viewerType: string) =>
      analytics.track('rfq_viewed', { rfq_id: rfqId, viewer_type: viewerType }),
    
    trackBidSubmitted: (rfqId: string, bidValue: number) =>
      analytics.track('bid_submitted', { rfq_id: rfqId, bid_value: bidValue }),
    
    trackBidAwarded: (rfqId: string, winnerId: string, value: number) =>
      analytics.track('bid_awarded', { rfq_id: rfqId, winner_id: winnerId, value }),
    
    trackRFQSearched: (query: string, filters: any, resultCount: number) =>
      analytics.track('rfq_searched', { query, filters, result_count: resultCount })
  }
}

/**
 * Track business registration events
 */
export function useRegistrationAnalytics() {
  const analytics = useProductAnalytics({
    defaultProperties: { category: 'registration' }
  })

  return {
    trackRegistrationStarted: (type: string) =>
      analytics.track('registration_started', { business_type: type }),
    
    trackRegistrationStep: (step: number, stepName: string) =>
      analytics.track('registration_step_completed', { step, step_name: stepName }),
    
    trackVerificationUploaded: (docType: string) =>
      analytics.track('verification_document_uploaded', { document_type: docType }),
    
    trackRegistrationCompleted: (businessType: string, timeToComplete: number) =>
      analytics.track('registration_completed', { 
        business_type: businessType,
        time_to_complete: timeToComplete
      }),
    
    trackRegistrationAbandoned: (step: number, reason?: string) =>
      analytics.track('registration_abandoned', { step, reason })
  }
}

/**
 * Track compliance and reporting events
 */
export function useComplianceAnalytics() {
  const analytics = useProductAnalytics({
    defaultProperties: { category: 'compliance' }
  })

  return {
    trackComplianceChecked: (percentage: number, target: number, compliant: boolean) =>
      analytics.track('compliance_checked', { percentage, target, compliant }),
    
    trackReportGenerated: (reportType: string, period: string) =>
      analytics.track('report_generated', { report_type: reportType, period }),
    
    trackComplianceAlertViewed: (alertType: string, severity: string) =>
      analytics.track('compliance_alert_viewed', { alert_type: alertType, severity }),
    
    trackRecommendationActioned: (recommendation: string, action: string) =>
      analytics.track('recommendation_actioned', { recommendation, action })
  }
}