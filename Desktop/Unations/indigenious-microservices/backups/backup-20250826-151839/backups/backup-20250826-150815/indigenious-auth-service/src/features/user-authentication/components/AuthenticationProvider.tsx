// Authentication Provider Component
// Main authentication context and state management

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useDataProvider } from '../../../shared/hooks/useDataProvider'
import type { User, AuthToken, LoginAttempt, UserSession } from '../types/auth.types'

interface AuthState {
  user: User | null
  token: AuthToken | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  registrationProgress: any | null
  mfaRequired: boolean
  mfaSecret: string | null
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: AuthToken } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_MFA_REQUIRED'; payload: { required: boolean; secret?: string } }
  | { type: 'REGISTRATION_PROGRESS'; payload: unknown }

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  registrationProgress: null,
  mfaRequired: false,
  mfaSecret: null
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        mfaRequired: false
      }
    
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false
      }
    
    case 'UPDATE_USER':
      return { ...state, user: action.payload }
    
    case 'SET_MFA_REQUIRED':
      return {
        ...state,
        mfaRequired: action.payload.required,
        mfaSecret: action.payload.secret || null,
        isLoading: false
      }
    
    case 'REGISTRATION_PROGRESS':
      return { ...state, registrationProgress: action.payload }
    
    default:
      return state
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, mfaCode?: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: unknown) => Promise<void>
  updateProfile: (profileData: unknown) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  enableMFA: () => Promise<{ secret: string; qrCode: string }>
  disableMFA: (code: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  verifyPhone: (code: string) => Promise<void>
  refreshToken: () => Promise<void>
  getRegistrationProgress: () => Promise<unknown>
  updateRegistrationProgress: (step: string, data: unknown) => Promise<void>
  requestVerification: (type: string) => Promise<void>
  socialLogin: (provider: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthenticationProvider')
  }
  return context
}

interface AuthenticationProviderProps {
  children: React.ReactNode
}

export function AuthenticationProvider({ children }: AuthenticationProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const dataProvider = useDataProvider()

  // Initialize authentication state from stored token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')
        
        if (storedToken && storedUser) {
          const token: AuthToken = JSON.parse(storedToken)
          const user: User = JSON.parse(storedUser)
          
          // Check if token is still valid
          if (new Date(token.expiresAt) > new Date()) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { user, token }
            })
            
            // Update last active time
            await updateLastActive(user.id)
          } else {
            // Token expired, try to refresh
            await refreshToken()
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        logger.error('Failed to initialize auth:', error)
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  // Update last active time
  const updateLastActive = async (userId: string) => {
    try {
      // This would call the API to update last active time
      logger.info('Updating last active time for user:', userId)
    } catch (error) {
      logger.error('Failed to update last active time:', error)
    }
  }

  // Login function
  const login = useCallback(async (email: string, password: string, mfaCode?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      // Mock login implementation
      logger.info('Attempting login:', email, { mfaCode })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock user data
      const mockUser: User = {
        id: 'user-123',
        email,
        emailVerified: true,
        phone: '+1-555-0123',
        phoneVerified: true,
        loginCount: 47,
        mfaEnabled: !!mfaCode,
        
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
          email,
          languages: ['en', 'fr'],
          primaryLanguage: 'en',
          businessProfile: {
            legalName: 'Indigenous Construction Co.',
            businessType: 'corporation',
            industryClassification: ['construction', 'infrastructure'],
            indigenousOwnership: 75,
            serviceCategories: ['construction', 'engineering'],
            capabilities: ['bridge construction', 'road maintenance'],
            experience: [],
            certifications: [],
            serviceAreas: ['Alberta', 'Saskatchewan'],
            headquarters: {
              street: '123 Main St',
              city: 'Calgary',
              province: 'AB',
              country: 'Canada',
              postalCode: 'T2P 1A1'
            },
            locations: [],
            description: 'Leading Indigenous construction company specializing in infrastructure projects.',
            keyPersonnel: [],
            portfolio: [],
            licenses: [],
            qualifications: [],
            references: [],
            pastPerformance: []
          }
        },
        
        role: 'business_owner',
        type: 'indigenous_business',
        status: 'active',
        verificationStatus: 'approved',
        
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'America/Edmonton',
          dateFormat: 'YYYY-MM-DD',
          showCulturalContent: true,
          showTraditionalNames: true,
          useTraditionalCalendar: false,
          preferredContactMethod: 'email',
          autoSaveEnabled: true,
          showTooltips: true,
          emailDigest: 'weekly',
          highContrast: false,
          largeText: false,
          screenReader: false,
          keyboardNavigation: false
        },
        
        privacySettings: {
          profileVisibility: 'members_only',
          showEmail: false,
          showPhone: false,
          showAddress: false,
          showFinancialInfo: false,
          showEmployeeCount: true,
          showRevenue: false,
          shareCulturalInformation: true,
          shareTraditionalKnowledge: false,
          allowCulturalConsultation: true,
          allowAnalytics: true,
          allowMarketingCommunications: false,
          allowThirdPartySharing: false
        },
        
        notificationSettings: {
          emailNotifications: true,
          emailTypes: {
            newOpportunities: true,
            applicationUpdates: true,
            messages: true,
            systemUpdates: false,
            newsletters: false
          },
          smsNotifications: false,
          smsTypes: {
            urgentMessages: false,
            deadlineReminders: false,
            verificationCodes: true
          },
          pushNotifications: true,
          pushTypes: {
            newMessages: true,
            opportunities: true,
            deadlines: true,
            systemAlerts: false
          },
          digestFrequency: 'daily'
        },
        
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        
        indigenousIdentity: {
          firstNation: 'Mikisew Cree First Nation',
          traditionalTerritory: 'Treaty 8',
          statusCardNumber: 'MC-12345',
          traditionalLanguage: 'Cree',
          indigenousOwnershipPercentage: 75,
          verificationStatus: 'approved',
          verificationDocuments: ['status-card.pdf', 'ownership-docs.pdf'],
          verifiedBy: 'admin-001',
          verifiedAt: '2024-01-20T14:30:00Z'
        },
        
        sessions: [],
        loginHistory: [],
        verificationDocuments: [],
        verifiedBy: 'admin-001',
        verifiedAt: '2024-01-20T14:30:00Z'
      }

      const mockToken: AuthToken = {
        accessToken: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        tokenType: 'Bearer',
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        scope: ['read', 'write']
      }

      // Check if MFA is required (simulate based on user settings)
      if (mockUser.mfaEnabled && !mfaCode) {
        dispatch({
          type: 'SET_MFA_REQUIRED',
          payload: { required: true }
        })
        return
      }

      // Store token and user in localStorage
      localStorage.setItem('auth_token', JSON.stringify(mockToken))
      localStorage.setItem('auth_user', JSON.stringify(mockUser))

      // Record login attempt
      const loginAttempt: LoginAttempt = {
        id: `login-${Date.now()}`,
        userId: mockUser.id,
        email,
        ipAddress: '192.168.1.1', // Would be actual IP
        userAgent: navigator.userAgent,
        success: true,
        method: 'email',
        mfaUsed: !!mfaCode,
        timestamp: new Date().toISOString()
      }

      logger.info('Login successful:', loginAttempt)

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: mockUser, token: mockToken }
      })

    } catch (error) {
      logger.error('Login failed:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Login failed'
      })
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Clear stored auth data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      
      // Invalidate session on server
      if (state.token) {
        logger.info('Invalidating session on server')
        // This would call the logout API
      }

      dispatch({ type: 'LOGOUT' })
      
    } catch (error) {
      logger.error('Logout failed:', error)
      // Even if server logout fails, clear local state
      dispatch({ type: 'LOGOUT' })
    }
  }, [state.token])

  // Register function
  const register = useCallback(async (userData: unknown) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      logger.info('Registering user:', userData)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Create new user (mock implementation)
      const newUser: User = {
        id: `user-${Date.now()}`,
        email: userData.email,
        emailVerified: false,
        loginCount: 0,
        mfaEnabled: false,
        
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          languages: ['en'],
          primaryLanguage: 'en'
        },
        
        role: userData.role || 'business_owner',
        type: userData.type || 'indigenous_business',
        status: 'pending',
        verificationStatus: 'pending',
        
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'America/Toronto',
          dateFormat: 'YYYY-MM-DD',
          showCulturalContent: true,
          showTraditionalNames: true,
          useTraditionalCalendar: false,
          preferredContactMethod: 'email',
          autoSaveEnabled: true,
          showTooltips: true,
          emailDigest: 'weekly',
          highContrast: false,
          largeText: false,
          screenReader: false,
          keyboardNavigation: false
        },
        
        privacySettings: {
          profileVisibility: 'members_only',
          showEmail: false,
          showPhone: false,
          showAddress: false,
          showFinancialInfo: false,
          showEmployeeCount: true,
          showRevenue: false,
          shareCulturalInformation: true,
          shareTraditionalKnowledge: false,
          allowCulturalConsultation: true,
          allowAnalytics: true,
          allowMarketingCommunications: false,
          allowThirdPartySharing: false
        },
        
        notificationSettings: {
          emailNotifications: true,
          emailTypes: {
            newOpportunities: true,
            applicationUpdates: true,
            messages: true,
            systemUpdates: true,
            newsletters: false
          },
          smsNotifications: false,
          smsTypes: {
            urgentMessages: false,
            deadlineReminders: false,
            verificationCodes: true
          },
          pushNotifications: true,
          pushTypes: {
            newMessages: true,
            opportunities: true,
            deadlines: true,
            systemAlerts: false
          },
          digestFrequency: 'daily'
        },
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        sessions: [],
        loginHistory: [],
        verificationDocuments: []
      }

      logger.info('User registered successfully:', newUser)
      
      // Initialize registration progress
      const registrationProgress = {
        userId: newUser.id,
        currentStep: 'basic_info',
        completedSteps: ['basic_info'],
        skippedSteps: [],
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalSteps: 5,
        completionPercentage: 20
      }

      dispatch({ type: 'REGISTRATION_PROGRESS', payload: registrationProgress })
      
      // Don't auto-login after registration, require email verification
      dispatch({ type: 'SET_LOADING', payload: false })

    } catch (error) {
      logger.error('Registration failed:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Registration failed'
      })
    }
  }, [])

  // Update profile function
  const updateProfile = useCallback(async (profileData: unknown) => {
    try {
      if (!state.user) throw new Error('No user logged in')

      logger.info('Updating profile:', profileData)

      // Update user profile
      const updatedUser: User = {
        ...state.user,
        profile: {
          ...state.user.profile,
          ...profileData
        },
        updatedAt: new Date().toISOString()
      }

      // Update stored user
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))

      dispatch({ type: 'UPDATE_USER', payload: updatedUser })

    } catch (error) {
      logger.error('Profile update failed:', error)
      throw error
    }
  }, [state.user])

  // Reset password function
  const resetPassword = useCallback(async (email: string) => {
    try {
      logger.info('Requesting password reset for:', email)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // This would send reset email
      logger.info('Password reset email sent')

    } catch (error) {
      logger.error('Password reset failed:', error)
      throw error
    }
  }, [])

  // Change password function
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      if (!state.user) throw new Error('No user logged in')

      logger.info('Changing password for user:', state.user.id)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      logger.info('Password changed successfully')

    } catch (error) {
      logger.error('Password change failed:', error)
      throw error
    }
  }, [state.user])

  // Enable MFA function
  const enableMFA = useCallback(async (): Promise<{ secret: string; qrCode: string }> => {
    try {
      if (!state.user) throw new Error('No user logged in')

      logger.info('Enabling MFA for user:', state.user.id)
      
      // Generate MFA secret and QR code
      const secret = 'MOCK_MFA_SECRET_' + Date.now()
      const qrCode = 'data:image/png;base64,mock_qr_code_data'
      
      return { secret, qrCode }

    } catch (error) {
      logger.error('MFA enable failed:', error)
      throw error
    }
  }, [state.user])

  // Disable MFA function
  const disableMFA = useCallback(async (code: string) => {
    try {
      if (!state.user) throw new Error('No user logged in')

      logger.info('Disabling MFA for user:', state.user.id, 'with code:', code)
      
      const updatedUser: User = {
        ...state.user,
        mfaEnabled: false,
        mfaSecret: undefined,
        updatedAt: new Date().toISOString()
      }

      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
      dispatch({ type: 'UPDATE_USER', payload: updatedUser })

    } catch (error) {
      logger.error('MFA disable failed:', error)
      throw error
    }
  }, [state.user])

  // Verify email function
  const verifyEmail = useCallback(async (token: string) => {
    try {
      logger.info('Verifying email with token:', token)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (state.user) {
        const updatedUser: User = {
          ...state.user,
          emailVerified: true,
          updatedAt: new Date().toISOString()
        }

        localStorage.setItem('auth_user', JSON.stringify(updatedUser))
        dispatch({ type: 'UPDATE_USER', payload: updatedUser })
      }

    } catch (error) {
      logger.error('Email verification failed:', error)
      throw error
    }
  }, [state.user])

  // Verify phone function
  const verifyPhone = useCallback(async (code: string) => {
    try {
      logger.info('Verifying phone with code:', code)
      
      if (state.user) {
        const updatedUser: User = {
          ...state.user,
          phoneVerified: true,
          updatedAt: new Date().toISOString()
        }

        localStorage.setItem('auth_user', JSON.stringify(updatedUser))
        dispatch({ type: 'UPDATE_USER', payload: updatedUser })
      }

    } catch (error) {
      logger.error('Phone verification failed:', error)
      throw error
    }
  }, [state.user])

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const storedRefreshToken = localStorage.getItem('auth_token')
      if (!storedRefreshToken) throw new Error('No refresh token available')

      logger.info('Refreshing authentication token')
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock new token
      const newToken: AuthToken = {
        accessToken: 'refreshed-jwt-token-' + Date.now(),
        refreshToken: 'refreshed-refresh-token-' + Date.now(),
        tokenType: 'Bearer',
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        scope: ['read', 'write']
      }

      localStorage.setItem('auth_token', JSON.stringify(newToken))

    } catch (error) {
      logger.error('Token refresh failed:', error)
      // If refresh fails, logout user
      await logout()
    }
  }, [logout])

  // Get registration progress
  const getRegistrationProgress = useCallback(async () => {
    try {
      if (!state.user) throw new Error('No user logged in')

      logger.info('Getting registration progress for user:', state.user.id)
      
      return state.registrationProgress

    } catch (error) {
      logger.error('Failed to get registration progress:', error)
      throw error
    }
  }, [state.user, state.registrationProgress])

  // Update registration progress
  const updateRegistrationProgress = useCallback(async (step: string, data: unknown) => {
    try {
      if (!state.user) throw new Error('No user logged in')

      logger.info('Updating registration progress:', step, data)
      
      const updatedProgress = {
        ...state.registrationProgress,
        currentStep: step,
        completedSteps: [...(state.registrationProgress?.completedSteps || []), step],
        lastActiveAt: new Date().toISOString(),
        completionPercentage: Math.min(((state.registrationProgress?.completedSteps?.length || 0) + 1) / 5 * 100, 100)
      }

      dispatch({ type: 'REGISTRATION_PROGRESS', payload: updatedProgress })

    } catch (error) {
      logger.error('Failed to update registration progress:', error)
      throw error
    }
  }, [state.user, state.registrationProgress])

  // Request verification
  const requestVerification = useCallback(async (type: string) => {
    try {
      if (!state.user) throw new Error('No user logged in')

      logger.info('Requesting verification:', type, 'for user:', state.user.id)
      
      // This would trigger verification process
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      logger.error('Verification request failed:', error)
      throw error
    }
  }, [state.user])

  // Social login
  const socialLogin = useCallback(async (provider: string) => {
    try {
      logger.info('Initiating social login with provider:', provider)
      
      // This would redirect to social provider or open popup
      switch (provider) {
        case 'google':
          window.location.href = '/auth/google'
          break
        case 'microsoft':
          window.location.href = '/auth/microsoft'
          break
        case 'gc_key':
          window.location.href = '/auth/gc-key'
          break
        default:
          throw new Error('Unsupported provider')
      }

    } catch (error) {
      logger.error('Social login failed:', error)
      throw error
    }
  }, [])

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    updateProfile,
    resetPassword,
    changePassword,
    enableMFA,
    disableMFA,
    verifyEmail,
    verifyPhone,
    refreshToken,
    getRegistrationProgress,
    updateRegistrationProgress,
    requestVerification,
    socialLogin
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}