// Login Form Component
// Secure login interface with MFA support

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion'
import { 
  Mail, Lock, Eye, EyeOff, Smartphone, AlertCircle, 
  CheckCircle, Loader2, Shield, Globe, User
} from 'lucide-react'
import { useAuth } from './AuthenticationProvider'

interface LoginFormProps {
  onSuccess?: () => void
  onForgotPassword?: () => void
  onRegister?: () => void
  redirectTo?: string
}

export function LoginForm({ onSuccess, onForgotPassword, onRegister, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [socialProvider, setSocialProvider] = useState<string | null>(null)
  
  const { login, socialLogin, isLoading, error, mfaRequired, mfaSecret } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await login(email, password, mfaCode || undefined)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      logger.error('Login failed:', error)
    }
  }

  const handleSocialLogin = async (provider: string) => {
    try {
      setSocialProvider(provider)
      await socialLogin(provider)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      logger.error('Social login failed:', error)
      setSocialProvider(null)
    }
  }

  const getSocialProviders = () => [
    {
      id: 'gc_key',
      name: 'Government of Canada',
      icon: Shield,
      color: 'bg-red-600 hover:bg-red-700',
      description: 'For government employees'
    },
    {
      id: 'google',
      name: 'Google',
      icon: Globe,
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Continue with Google'
    },
    {
      id: 'microsoft',
      name: 'Microsoft',
      icon: User,
      color: 'bg-blue-700 hover:bg-blue-800',
      description: 'Continue with Microsoft'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full 
          mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full 
          mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
          w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
      </div>

      <div className="relative max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 
            rounded-full flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Sign in to your Indigenious account
          </p>
        </motion.div>

        {/* Cultural Acknowledgment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-purple-200 text-sm font-medium">
                Territorial Acknowledgment
              </p>
              <p className="text-purple-100/80 text-xs mt-1">
                We acknowledge the traditional territories of Indigenous peoples across Canada
              </p>
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-400/30 rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* MFA Notice */}
        {mfaRequired && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <p className="text-amber-200 text-sm">
                Multi-factor authentication required. Please enter your verification code.
              </p>
            </div>
          </motion.div>
        )}

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg 
                    bg-white/5 text-white placeholder-white/40 focus:outline-none 
                    focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-white/20 rounded-lg 
                    bg-white/5 text-white placeholder-white/40 focus:outline-none 
                    focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-white/40 hover:text-white/60" />
                  ) : (
                    <Eye className="h-5 w-5 text-white/40 hover:text-white/60" />
                  )}
                </button>
              </div>
            </div>

            {/* MFA Code Field */}
            {mfaRequired && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label htmlFor="mfaCode" className="sr-only">
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    id="mfaCode"
                    name="mfaCode"
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg 
                      bg-white/5 text-white placeholder-white/40 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400 focus:border-transparent text-center 
                      tracking-widest font-mono"
                    placeholder="000000"
                  />
                </div>
                <p className="text-xs text-white/60 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </motion.div>
            )}

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/20 
                    rounded bg-white/10"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white/80">
                  Remember me
                </label>
              </div>

              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Forgot your password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (!mfaRequired && (!email || !password)) || (mfaRequired && !mfaCode)}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent 
                text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 
                hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
                focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed 
                transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  {mfaRequired ? 'Verify Code' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-white/60">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="mt-6 space-y-3">
            {getSocialProviders().map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSocialLogin(provider.id)}
                disabled={isLoading || socialProvider === provider.id}
                className={`w-full flex items-center justify-center px-4 py-3 border 
                  border-white/20 rounded-lg ${provider.color} text-white font-medium 
                  hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 
                  disabled:cursor-not-allowed`}
              >
                {socialProvider === provider.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <provider.icon className="w-5 h-5 mr-3" />
                    {provider.description}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              Don't have an account?{' '}
              <button
                onClick={onRegister}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Register here
              </button>
            </p>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="flex items-center justify-center space-x-2 text-white/40 text-xs">
            <Shield className="w-4 h-4" />
            <span>Secured with 256-bit encryption</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}