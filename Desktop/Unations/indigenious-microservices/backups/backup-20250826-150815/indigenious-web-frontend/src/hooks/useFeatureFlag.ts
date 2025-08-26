/**
 * React hooks for Feature Flags & Experimentation
 * Indigenous-aware feature management
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useUser } from '@supabase/auth-helpers-react'
import { featureFlags, type UserContext } from '@/lib/experimentation/feature-flag-system'
import { useProductAnalytics } from './useProductAnalytics'

interface FeatureFlagOptions {
  // Whether to log exposures (default: true)
  logExposure?: boolean
  // Additional user attributes
  attributes?: Record<string, any>
  // Fallback value if flag evaluation fails
  fallback?: any
  // Whether to update on user context changes
  dynamic?: boolean
}

interface ExperimentOptions {
  // Additional tracking properties
  trackingProperties?: Record<string, any>
  // Whether to track exposure immediately
  trackExposure?: boolean
}

/**
 * Check if a feature flag is enabled
 */
export function useFeatureFlag(
  flagName: string,
  options: FeatureFlagOptions = {}
): boolean {
  const user = useUser()
  const [enabled, setEnabled] = useState(options.fallback ?? false)
  const [loading, setLoading] = useState(true)

  const context = useMemo<UserContext | null>(() => {
    if (!user) return null
    
    return {
      userId: user.id,
      businessType: user.user_metadata?.business_type,
      communityId: user.user_metadata?.community_id,
      nation: user.user_metadata?.nation,
      territory: user.user_metadata?.territory,
      role: user.user_metadata?.role,
      attributes: {
        ...user.user_metadata,
        ...options.attributes
      }
    }
  }, [user, options.attributes])

  useEffect(() => {
    if (!context) {
      setEnabled(options.fallback ?? false)
      setLoading(false)
      return
    }

    const checkFlag = async () => {
      try {
        setLoading(true)
        const isEnabled = await featureFlags.checkGate(
          flagName,
          context,
          { logExposure: options.logExposure }
        )
        setEnabled(isEnabled)
      } catch (error) {
        logger.error(`Error checking feature flag ${flagName}:`, error)
        setEnabled(options.fallback ?? false)
      } finally {
        setLoading(false)
      }
    }

    checkFlag()

    // Re-check if dynamic updates enabled
    if (options.dynamic) {
      const interval = setInterval(checkFlag, 60000) // Every minute
      return () => clearInterval(interval)
    }
  }, [flagName, context, options.logExposure, options.fallback, options.dynamic])

  return loading ? (options.fallback ?? false) : enabled
}

/**
 * Get non-boolean feature flag value
 */
export function useFeatureValue<T = any>(
  flagName: string,
  defaultValue: T,
  options: FeatureFlagOptions = {}
): T {
  const user = useUser()
  const [value, setValue] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)

  const context = useMemo<UserContext | null>(() => {
    if (!user) return null
    
    return {
      userId: user.id,
      businessType: user.user_metadata?.business_type,
      communityId: user.user_metadata?.community_id,
      nation: user.user_metadata?.nation,
      territory: user.user_metadata?.territory,
      role: user.user_metadata?.role,
      attributes: {
        ...user.user_metadata,
        ...options.attributes
      }
    }
  }, [user, options.attributes])

  useEffect(() => {
    if (!context) {
      setValue(defaultValue)
      setLoading(false)
      return
    }

    const getValue = async () => {
      try {
        setLoading(true)
        const flagValue = await featureFlags.getValue(
          flagName,
          context,
          defaultValue
        )
        setValue(flagValue)
      } catch (error) {
        logger.error(`Error getting feature value ${flagName}:`, error)
        setValue(defaultValue)
      } finally {
        setLoading(false)
      }
    }

    getValue()
  }, [flagName, context, defaultValue])

  return loading ? defaultValue : value
}

/**
 * Get experiment assignment
 */
export function useExperiment(
  experimentName: string,
  options: ExperimentOptions = {}
): {
  variant: string | null
  parameters: Record<string, any>
  loading: boolean
  trackConversion: (metric?: string, value?: number) => Promise<void>
} {
  const user = useUser()
  const analytics = useProductAnalytics()
  const [variant, setVariant] = useState<string | null>(null)
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const context = useMemo<UserContext | null>(() => {
    if (!user) return null
    
    return {
      userId: user.id,
      businessType: user.user_metadata?.business_type,
      communityId: user.user_metadata?.community_id,
      nation: user.user_metadata?.nation,
      territory: user.user_metadata?.territory,
      role: user.user_metadata?.role
    }
  }, [user])

  useEffect(() => {
    if (!context) {
      setLoading(false)
      return
    }

    const getExperiment = async () => {
      try {
        setLoading(true)
        const result = await featureFlags.getExperiment(experimentName, context)
        
        if (result) {
          setVariant(result.variant)
          setParameters(result.parameters)
          
          // Track exposure if requested
          if (options.trackExposure && result.exposureLogged) {
            await analytics.track('experiment_viewed', {
              experiment: experimentName,
              variant: result.variant,
              ...options.trackingProperties
            })
          }
        }
      } catch (error) {
        logger.error(`Error getting experiment ${experimentName}:`, error)
      } finally {
        setLoading(false)
      }
    }

    getExperiment()
  }, [experimentName, context, options.trackExposure, options.trackingProperties])

  const trackConversion = useCallback(async (
    metric?: string,
    value?: number
  ) => {
    if (!variant) return

    await analytics.track(metric || 'experiment_conversion', {
      experiment: experimentName,
      variant,
      conversion_value: value,
      ...options.trackingProperties
    })
  }, [experimentName, variant, analytics, options.trackingProperties])

  return {
    variant,
    parameters,
    loading,
    trackConversion
  }
}

/**
 * Get layer configuration
 */
export function useLayer(
  layerName: string,
  options: FeatureFlagOptions = {}
): {
  config: Record<string, any>
  loading: boolean
} {
  const user = useUser()
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const context = useMemo<UserContext | null>(() => {
    if (!user) return null
    
    return {
      userId: user.id,
      businessType: user.user_metadata?.business_type,
      communityId: user.user_metadata?.community_id,
      nation: user.user_metadata?.nation,
      territory: user.user_metadata?.territory,
      role: user.user_metadata?.role,
      attributes: options.attributes
    }
  }, [user, options.attributes])

  useEffect(() => {
    if (!context) {
      setLoading(false)
      return
    }

    const getLayer = async () => {
      try {
        setLoading(true)
        const layerConfig = await featureFlags.getLayer(layerName, context)
        setConfig(layerConfig)
      } catch (error) {
        logger.error(`Error getting layer ${layerName}:`, error)
        setConfig({})
      } finally {
        setLoading(false)
      }
    }

    getLayer()
  }, [layerName, context])

  return { config, loading }
}

/**
 * Community-specific feature flag hook
 */
export function useCommunityFeature(
  flagName: string,
  communityId?: string
): {
  enabled: boolean
  loading: boolean
  reason?: string
} {
  const user = useUser()
  const effectiveCommunityId = communityId || user?.user_metadata?.community_id
  
  const [state, setState] = useState({
    enabled: false,
    loading: true,
    reason: undefined as string | undefined
  })

  useEffect(() => {
    if (!user || !effectiveCommunityId) {
      setState({ enabled: false, loading: false, reason: 'No community context' })
      return
    }

    const checkCommunityFeature = async () => {
      try {
        const context: UserContext = {
          userId: user.id,
          communityId: effectiveCommunityId,
          attributes: {
            checkingCommunityFeature: true
          }
        }

        const enabled = await featureFlags.checkGate(flagName, context)
        
        setState({
          enabled,
          loading: false,
          reason: enabled ? undefined : 'Feature not available for community'
        })
      } catch (error) {
        setState({
          enabled: false,
          loading: false,
          reason: 'Error checking feature availability'
        })
      }
    }

    checkCommunityFeature()
  }, [flagName, user, effectiveCommunityId])

  return state
}

/**
 * Batch feature flags hook
 */
export function useFeatureFlags(
  flagNames: string[],
  options: FeatureFlagOptions = {}
): {
  flags: Record<string, boolean>
  loading: boolean
} {
  const user = useUser()
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  const context = useMemo<UserContext | null>(() => {
    if (!user) return null
    
    return {
      userId: user.id,
      businessType: user.user_metadata?.business_type,
      communityId: user.user_metadata?.community_id,
      nation: user.user_metadata?.nation,
      territory: user.user_metadata?.territory,
      role: user.user_metadata?.role,
      attributes: options.attributes
    }
  }, [user, options.attributes])

  useEffect(() => {
    if (!context) {
      setFlags({})
      setLoading(false)
      return
    }

    const checkFlags = async () => {
      try {
        setLoading(true)
        const results: Record<string, boolean> = {}
        
        // Check flags in parallel
        await Promise.all(
          flagNames.map(async (flagName) => {
            try {
              results[flagName] = await featureFlags.checkGate(
                flagName,
                context,
                { logExposure: options.logExposure }
              )
            } catch (error) {
              results[flagName] = false
            }
          })
        )
        
        setFlags(results)
      } catch (error) {
        logger.error('Error checking feature flags:', error)
        setFlags({})
      } finally {
        setLoading(false)
      }
    }

    checkFlags()
  }, [flagNames.join(','), context, options.logExposure])

  return { flags, loading }
}

/**
 * Hook for gradual rollout monitoring
 */
export function useRolloutStatus(flagName: string): {
  percentage: number
  isInRollout: boolean
  loading: boolean
} {
  const user = useUser()
  const [status, setStatus] = useState({
    percentage: 0,
    isInRollout: false,
    loading: true
  })

  useEffect(() => {
    // This would connect to the feature flag system's rollout status
    // For now, returning mock data
    setStatus({
      percentage: 75,
      isInRollout: true,
      loading: false
    })
  }, [flagName, user])

  return status
}